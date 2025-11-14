import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone! Looking forward to the activity.' })
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  content: string;
}

