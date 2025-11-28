import { URLSearchParams } from 'url';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { Express } from 'express';
import { User, UserDocument } from './schemas/user.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CoachVerificationStatusDto } from './dto/coach-verification-status.dto';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
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

  async setEmailVerificationToken(id: string, token: string | undefined):
   Promise<UserDocument | null> {
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

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.updatePassword(id, hashedPassword);

    return { message: 'Password updated successfully' };
  }

  async updateProfileImage(id: string, file: Express.Multer.File): Promise<UserDocument | null> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Invalid image type. Please upload a valid image file.');
    }

    const apiKey =
      (this.configService.get<string>('IMGBB_API_KEY') || process.env.IMGBB_API_KEY || '5bcfdc535939a696f5a6916a331f90c6').trim();

    if (!apiKey) {
      this.logger.error('IMGBB_API_KEY is not configured in the environment');
      throw new InternalServerErrorException('Image upload service is not configured');
    }

    this.logger.debug(`Using imgbb key (first 4 chars): ${apiKey.slice(0, 4)}***`);

    const base64Image = file.buffer.toString('base64');

    const formBody = new URLSearchParams();
    formBody.append('image', base64Image);
    if (file.originalname) {
      formBody.append('name', file.originalname);
    }

    try {
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
        formBody.toString(),
        {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
        },
      );

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

  /**
   * Search users by name or email (case-insensitive)
   * Returns users matching the search query for chat functionality
   */
  async searchUsers(query: string, currentUserId?: string): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    
    const users = await this.userModel
      .find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
        ],
      })
      .select('_id name email profileImageUrl profileImageThumbnailUrl')
      .limit(20)
      .exec();

    // Transform to match iOS DTO format (tolerant to id/_id and profileImageUrl/avatar)
    return users.map((user) => ({
      id: user._id.toString(),
      _id: user._id.toString(), // Include both for iOS compatibility
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl || user.profileImageThumbnailUrl || null,
      avatar: user.profileImageUrl || user.profileImageThumbnailUrl || null, // Alias for iOS compatibility
      profileImageThumbnailUrl: user.profileImageThumbnailUrl || null,
    }));
  }

  /**
   * Récupère le profil complet d'un utilisateur par son ID
   * Inclut les statistiques (activités créées, activités rejointes, etc.)
   */
  async getUserProfileById(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Récupérer les statistiques de l'utilisateur
    const activitiesJoined = await this.activityModel.countDocuments({
      participantIds: new Types.ObjectId(userId),
    }).exec();

    const activitiesHosted = await this.activityModel.countDocuments({
      creator: new Types.ObjectId(userId),
    }).exec();

    // Calculer l'âge à partir de la date de naissance
    const calculateAge = (dateOfBirth: string | undefined): number => {
      if (!dateOfBirth) return 0;
      try {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age > 0 ? age : 0;
      } catch (error) {
        return 0;
      }
    };

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      age: calculateAge(user.dateOfBirth),
      location: user.location || 'Non spécifiée',
      isEmailVerified: user.isEmailVerified || false,
      phone: user.phone || null,
      dateOfBirth: user.dateOfBirth || null,
      about: user.about || 'Aucune description',
      bio: user.about || 'Aucune description',
      sportsInterests: user.sportsInterests || [],
      profileImageUrl: user.profileImageUrl || null,
      profileImageThumbnailUrl: user.profileImageThumbnailUrl || null,
      profileImageDeleteUrl: user.profileImageDeleteUrl || null,
      // Données enrichies
      stats: {
        sessionsJoined: activitiesJoined || 0,
        sessionsHosted: activitiesHosted || 0,
        followers: 0, // À implémenter si vous avez un système de followers
        following: 0, // À implémenter si vous avez un système de following
        favoriteSports: user.sportsInterests || [],
      },
      // Champs additionnels pour compatibilité
      avatarUrl: user.profileImageUrl || user.profileImageThumbnailUrl || null,
      coverImageUrl: user.profileImageUrl || user.profileImageThumbnailUrl || null,
      interests: user.sportsInterests || [],
      rating: 0, // À implémenter si vous avez un système de rating
      activitiesJoined: activitiesJoined || 0,
    };
  }

  async updateCoachVerificationStatus(
    userId: string,
    dto: CoachVerificationStatusDto,
  ): Promise<UserDocument> {
    const updateData: any = {
      isCoachVerified: dto.isCoachVerified,
    };

    if (dto.isCoachVerified) {
      updateData.coachVerificationData = {
        coachName: dto.coachName,
        confidenceScore: dto.confidenceScore,
        verificationReasons: dto.verificationReasons,
        verifiedAt: new Date(),
      };
    } else {
      // Si la vérification est retirée, effacer les données
      updateData.coachVerificationData = null;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}

