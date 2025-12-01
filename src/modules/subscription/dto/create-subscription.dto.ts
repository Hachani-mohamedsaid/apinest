import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { SubscriptionType } from '../subscription.schema';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ValidateIf((o) => o.type !== SubscriptionType.FREE)
  @IsString()
  paymentMethodId?: string; // Stripe Payment Method ID
}

