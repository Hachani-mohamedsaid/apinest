import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { SubscriptionType } from '../subscription.schema';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ValidateIf((o) => o.type !== SubscriptionType.FREE && !o.setupIntentId)
  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe Payment Method ID

  @ValidateIf((o) => o.type !== SubscriptionType.FREE && !o.paymentMethodId)
  @IsString()
  @IsOptional()
  setupIntentId?: string; // Stripe SetupIntent ID (alternative à paymentMethodId)
}

