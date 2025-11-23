import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
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

// ✅ NOUVEAU : DTO pour les conseils personnalisés
export class PersonalizedTipDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  icon: string;

  @IsString()
  category: string; // "training", "nutrition", "recovery", "motivation", "health"

  @IsOptional()
  @IsString()
  priority?: string; // "high", "medium", "low"
}

export class AICoachSuggestionsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestedActivityDto)
  suggestions: SuggestedActivityDto[];

  // ✅ NOUVEAU : Ajouter les conseils personnalisés
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalizedTipDto)
  personalizedTips?: PersonalizedTipDto[];
}

