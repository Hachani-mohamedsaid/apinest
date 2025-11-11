import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex Johnson' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'alex.johnson@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '15/06/1995' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Passionate about sports and staying active! Love meeting new people through fitness.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'About section must be 200 characters or fewer' })
  about?: string;

  @ApiPropertyOptional({
    example: ['Basketball', 'Running', 'Swimming'],
    description: 'List of sports interests selected by the user',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'You can select up to 20 sports interests' })
  @ArrayUnique({ message: 'Sports interests must be unique' })
  @IsString({ each: true })
  sportsInterests?: string[];

  @ApiPropertyOptional({
    example: 'https://i.ibb.co/your-image-url',
    description: 'Read-only: automatically filled after upload',
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}


