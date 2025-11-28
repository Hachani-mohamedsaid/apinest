import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID de l\'activité à payer',
  })
  @IsString()
  activityId: string;

  @ApiProperty({
    example: 25.0,
    description: 'Montant à payer',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'eur',
    description: 'Devise (par défaut: eur)',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string = 'eur';
}

