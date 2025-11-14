import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LikeProfileDto {
  @ApiProperty({
    description: 'ID du profil à liker',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty({ message: 'Profile ID is required' })
  profileId: string;
}

