import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LikeProfileDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the profile to like',
  })
  @IsString()
  @IsNotEmpty({ message: 'Profile ID is required' })
  profileId: string;
}

