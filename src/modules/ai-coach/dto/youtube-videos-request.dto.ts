import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsInt, Min, Max } from 'class-validator';

export class YouTubeVideosRequestDto {
  @ApiPropertyOptional({
    example: ['Running', 'Cycling'],
    description: 'Sports préférés pour filtrer les vidéos',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sportPreferences?: string[];

  @ApiPropertyOptional({
    example: 10,
    description: 'Nombre maximum de vidéos à retourner (1-50)',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxResults?: number = 10;
}

