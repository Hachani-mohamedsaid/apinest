import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({
    example: 'Football',
    enum: ['Football', 'Basketball', 'Running', 'Cycling'],
    description: 'Type of sport activity',
  })
  @IsString()
  @IsNotEmpty({ message: 'Sport type is required' })
  @IsEnum(['Football', 'Basketball', 'Running', 'Cycling'], {
    message: 'Sport type must be one of: Football, Basketball, Running, Cycling',
  })
  sportType: string;

  @ApiProperty({ example: 'Weekend Football Match', description: 'Activity title' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title: string;

  @ApiPropertyOptional({
    example: 'Join us for a friendly football match this weekend!',
    description: 'Activity description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Central Park, New York', description: 'Activity location name' })
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @ApiPropertyOptional({
    example: 40.785091,
    description: 'Latitude coordinate of the location',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: -73.968285,
    description: 'Longitude coordinate of the location',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    example: '2025-11-15',
    description: 'Activity date in ISO 8601 format (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @ApiProperty({
    example: '2025-11-15T14:30:00Z',
    description: 'Activity time in ISO 8601 format',
  })
  @IsDateString({}, { message: 'Time must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Time is required' })
  time: string;

  @ApiProperty({
    example: 10,
    description: 'Number of participants (1-100)',
    minimum: 1,
    maximum: 100,
    default: 5,
  })
  @IsNumber()
  @Min(1, { message: 'Participants must be at least 1' })
  @Max(100, { message: 'Participants cannot exceed 100' })
  participants: number;

  @ApiProperty({
    example: 'Intermediate',
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    description: 'Skill level required',
  })
  @IsString()
  @IsNotEmpty({ message: 'Level is required' })
  @IsEnum(['Beginner', 'Intermediate', 'Advanced'], {
    message: 'Level must be one of: Beginner, Intermediate, Advanced',
  })
  level: string;

  @ApiProperty({
    example: 'public',
    enum: ['public', 'friends'],
    description: 'Activity visibility',
    default: 'public',
  })
  @IsString()
  @IsEnum(['public', 'friends'], {
    message: 'Visibility must be either "public" or "friends"',
  })
  visibility: string;
}

