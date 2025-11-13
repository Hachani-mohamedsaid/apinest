import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'Hey! Are we still on for swimming tomorrow?',
    description: 'Message text content',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message text is required' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(5000, { message: 'Message cannot exceed 5000 characters' })
  text: string;
}

