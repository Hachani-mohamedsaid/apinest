import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';

export class CoachVerificationStatusDto {
  @ApiProperty({ example: true, description: 'Statut de vérification coach' })
  @IsBoolean()
  isCoachVerified: boolean;

  @ApiPropertyOptional({ example: 'John Smith', description: 'Nom du coach' })
  @IsOptional()
  @IsString()
  coachName?: string;

  @ApiPropertyOptional({ example: 0.85, description: 'Score de confiance (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({
    example: [
      "Type d'utilisateur: Coach/Trainer",
      'Spécialisation fournie: Running, Fitness',
      'Certifications fournies',
    ],
    description: 'Raisons de la vérification',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verificationReasons?: string[];
}

