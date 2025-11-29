import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class YouTubeVideoDto {
  @ApiProperty({ example: 'dQw4w9WgXcQ', description: 'ID de la vidéo YouTube' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Running Workout Tutorial', description: 'Titre de la vidéo' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Learn proper running form and technique...',
    description: 'Description de la vidéo',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    description: 'URL de la miniature',
  })
  @IsString()
  thumbnailUrl: string;

  @ApiProperty({ example: 'Fitness Channel', description: 'Nom de la chaîne' })
  @IsString()
  channelTitle: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Date de publication' })
  @IsString()
  publishedAt: string;

  @ApiPropertyOptional({
    example: 'PT10M30S',
    description: 'Durée de la vidéo (format ISO 8601)',
  })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Nombre de vues',
  })
  @IsOptional()
  @IsString()
  viewCount?: string;
}

export class YouTubeVideosResponseDto {
  @ApiProperty({
    type: [YouTubeVideoDto],
    description: 'Liste des vidéos YouTube',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => YouTubeVideoDto)
  videos: YouTubeVideoDto[];
}

