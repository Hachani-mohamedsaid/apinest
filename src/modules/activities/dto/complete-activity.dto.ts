import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class CompleteActivityDto {
  @ApiPropertyOptional({
    example: 30,
    description: 'Duration of the activity in minutes',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Duration must be at least 1 minute' })
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 5.5,
    description: 'Distance covered in kilometers (optional, only for activities with distance)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Distance cannot be negative' })
  distanceKm?: number;
}

