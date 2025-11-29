import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID de l\'activité à noter',
  })
  @IsString()
  activityId: string;

  @ApiProperty({
    example: 5,
    description: 'Note de 1 à 5',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must be at most 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Great session! Very professional coach.',
    description: 'Commentaire optionnel',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

