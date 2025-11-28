import {
  Body,Controller,Delete,Patch,Param,Get, Request,UploadedFile,UseGuards, UseInterceptors,  ForbiddenException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Express } from 'express';
import { memoryStorage } from 'multer';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CoachVerificationStatusDto } from './dto/coach-verification-status.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user._id.toString());
    
    if (!user) {
      return req.user;
    }

    const userObj = user.toObject();
    const { password, ...userWithoutPassword } = userObj;

    return {
      ...userWithoutPassword,
      isCoachVerified: user.isCoachVerified || false,
      coachVerificationData: user.coachVerificationData || null,
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  searchUsers(@Query('search') search: string, @Request() req) {
    return this.usersService.searchUsers(search, req.user?._id?.toString());
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  getUserProfileById(@Param('id') userId: string) {
    return this.usersService.getUserProfileById(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateProfileDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateProfileImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateProfileImage(id, file);
  }

  @Patch(':id/change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    if (!req.user?._id || req.user._id.toString() !== id) {
      throw new ForbiddenException('You can only change your own password');
    }

    return this.usersService.changePassword(id, changePasswordDto.currentPassword, changePasswordDto.newPassword);
  }

  @Patch(':id/coach-verification')
  @UseGuards(JwtAuthGuard)
  async updateCoachVerificationStatus(
    @Param('id') userId: string,
    @Body() dto: CoachVerificationStatusDto,
    @Request() req,
  ) {
    // Vérifier que l'utilisateur modifie son propre profil
    if (!req.user?._id || req.user._id.toString() !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.usersService.updateCoachVerificationStatus(userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

