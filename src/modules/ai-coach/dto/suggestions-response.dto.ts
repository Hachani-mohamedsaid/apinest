import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
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

  @IsNumber()
  matchScore: number;
}

export class AICoachSuggestionsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestedActivityDto)
  suggestions: SuggestedActivityDto[];
}

