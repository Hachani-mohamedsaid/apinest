import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class UpdateActivityDto {
  @ApiPropertyOptional({
    example: 'Football',
    enum: ['Football', 'Basketball', 'Running', 'Cycling'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['Football', 'Basketball', 'Running', 'Cycling'])
  sportType?: string;

  @ApiPropertyOptional({ example: 'Weekend Football Match' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'Join us for a friendly football match!' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Central Park, New York' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 40.785091 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -73.968285 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '2025-11-15' })
  @IsOptional()
  @IsDateString({})
  date?: string;

  @ApiPropertyOptional({ example: '2025-11-15T14:30:00Z' })
  @IsOptional()
  @IsDateString({})
  time?: string;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  participants?: number;

  @ApiPropertyOptional({
    example: 'Intermediate',
    enum: ['Beginner', 'Intermediate', 'Advanced'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['Beginner', 'Intermediate', 'Advanced'])
  level?: string;

  @ApiPropertyOptional({
    example: 'public',
    enum: ['public', 'friends'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['public', 'friends'])
  visibility?: string;
}

