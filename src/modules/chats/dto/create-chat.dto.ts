import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of user IDs participating in the chat',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one participant is required' })
  @ArrayMaxSize(50, { message: 'Maximum 50 participants allowed' })
  @IsString({ each: true })
  participantIds: string[];

  @ApiPropertyOptional({
    example: 'Basketball Squad',
    description: 'Group name (required if isGroup is true)',
  })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({
    example: 'https://i.pravatar.cc/150?img=15',
    description: 'Group avatar URL',
  })
  @IsOptional()
  @IsString()
  groupAvatar?: string;
}

