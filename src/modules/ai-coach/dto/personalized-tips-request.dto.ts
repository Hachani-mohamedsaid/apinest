import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsArray, IsString } from 'class-validator';

export class PersonalizedTipsRequestDto {
  @ApiProperty({ example: 3, description: 'Nombre d\'entraînements de la semaine' })
  @IsInt()
  workouts: number;

  @ApiProperty({ example: 1200, description: 'Calories brûlées de la semaine' })
  @IsInt()
  calories: number;

  @ApiProperty({ example: 180, description: 'Minutes d\'activité de la semaine' })
  @IsInt()
  minutes: number;

  @ApiProperty({ example: 7, description: 'Série actuelle (streak) en jours' })
  @IsInt()
  streak: number;

  @ApiPropertyOptional({
    example: ['Running', 'Cycling'],
    description: 'Sports préférés de l\'utilisateur',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sportPreferences?: string[];

  @ApiPropertyOptional({
    example: ['Morning Run', 'Evening Bike'],
    description: 'Activités récentes',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentActivities?: string[];

  @ApiPropertyOptional({
    example: 'Strava: 3 workouts, 1200 calories, 180 minutes, 7 day streak',
    description: 'Données Strava (JSON string)',
  })
  @IsOptional()
  @IsString()
  stravaData?: string;
}

