import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatParticipantDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'User email',
  })
  email?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/john.jpg',
    description: 'User profile image URL',
  })
  profileImageUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/john.jpg',
    description: 'User avatar URL (alias for profileImageUrl)',
  })
  avatar?: string;
}

