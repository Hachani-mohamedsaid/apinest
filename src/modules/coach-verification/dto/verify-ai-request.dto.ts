import { IsString, IsEmail, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CoachVerificationAIRequestDto {
  @ApiProperty({ example: 'Coach / Trainer', description: 'Type of user' })
  @IsString()
  @IsNotEmpty()
  userType: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Certified personal trainer with 5 years of experience', description: 'About section' })
  @IsString()
  @IsNotEmpty()
  about: string;

  @ApiProperty({ example: 'Running, Fitness', description: 'Specialization areas' })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiProperty({ example: '5', description: 'Years of experience' })
  @IsString()
  @IsNotEmpty()
  yearsOfExperience: string;

  @ApiProperty({ example: 'NASM CPT, ACE', description: 'Certifications' })
  @IsString()
  @IsNotEmpty()
  certifications: string;

  @ApiProperty({ example: 'Paris, France', description: 'Location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ 
    example: ['https://example.com/cert.pdf', 'https://example.com/id.jpg'], 
    description: 'URLs of documents/images',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  documents: string[]; // URLs des images/documents

  @ApiProperty({ example: 'Additional notes', description: 'Optional additional note', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

