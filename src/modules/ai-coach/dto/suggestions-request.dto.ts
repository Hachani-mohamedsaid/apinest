import { IsString, IsOptional, IsNumber, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StravaActivityDto {
  @IsString()
  type: string; // "Run", "Ride", "Swim", etc.

  @IsNumber()
  distance: number; // en mètres

  @IsNumber()
  duration: number; // en secondes

  @IsOptional()
  @IsNumber()
  averageSpeed?: number; // en m/s

  @IsOptional()
  @IsNumber()
  elevationGain?: number; // en mètres

  @IsString()
  date: string; // ISO date
}

export class StravaWeeklyStatsDto {
  @IsNumber()
  totalDistance: number;

  @IsNumber()
  totalTime: number;

  @IsNumber()
  activitiesCount: number;
}

export class StravaDataDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StravaActivityDto)
  recentActivities?: StravaActivityDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => StravaWeeklyStatsDto)
  weeklyStats?: StravaWeeklyStatsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteSports?: string[];

  @IsOptional()
  @IsString()
  performanceTrend?: 'improving' | 'stable' | 'declining';
}

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

  // ✅ NOUVEAU : Données Strava
  @IsOptional()
  @ValidateNested()
  @Type(() => StravaDataDto)
  stravaData?: StravaDataDto;

  // ✅ NOUVEAU : Données de l'application
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentAppActivities?: string[]; // IDs des activités récentes dans l'app

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  joinedActivities?: string[]; // IDs des activités auxquelles l'utilisateur a participé

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  createdActivities?: string[]; // IDs des activités créées par l'utilisateur

  @IsOptional()
  @IsString()
  location?: string; // Localisation de l'utilisateur

  @IsOptional()
  @IsString()
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
}

