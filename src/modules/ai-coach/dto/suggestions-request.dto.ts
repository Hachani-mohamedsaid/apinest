import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AICoachSuggestionsRequestDto {
  @IsNumber()
  workouts: number;

  @IsNumber()
  calories: number;

  @IsNumber()
  minutes: number;

  @IsNumber()
  streak: number;

  @IsOptional()
  @IsString()
  sportPreferences?: string;
}

