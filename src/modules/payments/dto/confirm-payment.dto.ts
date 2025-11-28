import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'pi_xxx',
    description: 'ID du Payment Intent Stripe',
  })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID de l\'activité',
  })
  @IsString()
  activityId: string;
}

