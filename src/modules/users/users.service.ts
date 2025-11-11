import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { Express } from 'express';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: any): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateProfileDto): Promise<UserDocument | null> {
    const currentUser = await this.userModel.findById(id).exec();

    if (!currentUser) {
      return null;
    }

    const payload: Partial<UpdateProfileDto & { emailVerificationToken?: string; isEmailVerified?: boolean }> = {
      ...updateUserDto,
    };

    if (Array.isArray(updateUserDto?.sportsInterests)) {
      payload.sportsInterests = updateUserDto.sportsInterests.filter((interest) => !!interest?.trim());
    }

    let verificationToken: string | undefined;

    if (updateUserDto.email && updateUserDto.email !== currentUser.email) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      payload.emailVerificationToken = verificationToken;
      payload.isEmailVerified = false;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(id, payload, { new: true }).exec();

    if (updatedUser && verificationToken) {
      try {
        await this.mailService.sendVerificationEmail(updatedUser.email, verificationToken);
      } catch (error) {
        this.logger.error(`Failed to send verification email to ${updatedUser.email}`, error instanceof Error ? error.stack : undefined);
        throw new InternalServerErrorException('Failed to send verification email. Please try again later.');
      }
    }

    return updatedUser;
  }

  async remove(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // Token non expiré
    }).exec();
  }

  async updatePassword(id: string, hashedPassword: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      },
      { new: true }
    ).exec();
  }

  async setResetToken(email: string, token: string | undefined, expires: Date | undefined): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { email },
      {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
      { new: true }
    ).exec();
  }

  async setEmailVerificationToken(id: string, token: string | undefined): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          emailVerificationToken: token,
          isEmailVerified: token ? false : true,
        },
        { new: true },
      )
      .exec();
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ emailVerificationToken: token }).exec();
  }

  async markEmailAsVerified(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          isEmailVerified: true,
          emailVerificationToken: undefined,
        },
        { new: true },
      )
      .exec();
  }

  async updateProfileImage(id: string, file: Express.Multer.File): Promise<UserDocument | null> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Invalid image type. Please upload a valid image file.');
    }

    const apiKey = this.configService.get<string>('IMGBB_API_KEY') || process.env.IMGBB_API_KEY;

    if (!apiKey) {
      this.logger.error('IMGBB_API_KEY is not configured in the environment');
      throw new InternalServerErrorException('Image upload service is not configured');
    }

    const base64Image = file.buffer.toString('base64');

    const formBody = new URLSearchParams();
    formBody.append('key', apiKey);
    formBody.append('image', base64Image);

    try {
      const response = await axios.post('https://api.imgbb.com/1/upload', formBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });

      if (!response.data?.success || !response.data?.data) {
        this.logger.error(`Unexpected response from imgbb: ${JSON.stringify(response.data)}`);
        throw new InternalServerErrorException('Failed to upload image. Please try again later.');
      }

      const imageData = response.data.data;

      return this.userModel
        .findByIdAndUpdate(
          id,
          {
            profileImageUrl: imageData.url ?? imageData.display_url,
            profileImageDeleteUrl: imageData.delete_url,
            profileImageThumbnailUrl: imageData.medium?.url ?? imageData.thumb?.url,
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { error?: { message?: string } })?.error?.message ?? error.message;
        this.logger.error(`Failed to upload profile image to imgbb: ${message}`);
        throw new InternalServerErrorException(`Failed to upload image: ${message}`);
      }

      this.logger.error('Unexpected error while uploading profile image', (error as Error).stack);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }
}

