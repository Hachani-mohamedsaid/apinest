import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SuggestedActivityDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  sportType: string;

  @IsString()
  location: string;

  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsNumber()
  participants: number;

  @IsNumber()
  maxParticipants: number;

  @IsString()
  level: string;

  @IsOptional()
  @IsNumber()
  matchScore?: number;
}

export class SuggestedUserDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsString()
  sport: string;

  @IsOptional()
  @IsString()
  distance?: string;

  @IsOptional()
  @IsNumber()
  matchScore?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  availability?: string;
}

export class ChatResponseDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestedActivityDto)
  suggestedActivities?: SuggestedActivityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestedUserDto)
  suggestedUsers?: SuggestedUserDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

