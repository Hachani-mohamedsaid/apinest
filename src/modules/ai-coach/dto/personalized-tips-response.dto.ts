import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalizedTipDto {
  @ApiProperty({ example: 'ai-tip-1234567890-0', description: 'ID unique du conseil' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Maintenez votre série', description: 'Titre du conseil' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Vous avez une série de 7 jours ! Continuez à vous entraîner régulièrement...',
    description: 'Description détaillée du conseil',
  })
  @IsString()
  description: string;

  @ApiProperty({ example: '🔥', description: 'Emoji/icône du conseil' })
  @IsString()
  icon: string;

  @ApiProperty({
    example: 'motivation',
    description: 'Catégorie du conseil (training, nutrition, recovery, motivation, health)',
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    example: 'high',
    description: 'Priorité du conseil (high, medium, low)',
  })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class PersonalizedTipsResponseDto {
  @ApiProperty({
    type: [PersonalizedTipDto],
    description: 'Liste des conseils personnalisés',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalizedTipDto)
  tips: PersonalizedTipDto[];
}

