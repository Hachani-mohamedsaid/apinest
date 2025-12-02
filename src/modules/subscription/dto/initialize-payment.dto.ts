import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { SubscriptionType } from '../subscription.schema';

export class InitializePaymentDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(SubscriptionType)
  planType: SubscriptionType; // "premium_normal", "premium_gold", "premium_platinum"
}

