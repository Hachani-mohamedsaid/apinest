import { SubscriptionResponseDto, SubscriptionFeaturesDto } from './subscription-response.dto';

export class SubscriptionPlanDto {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  interval: string; // 'month' or 'year'
  activitiesLimit: number;
  features: SubscriptionFeaturesDto;
  popular?: boolean;
  stripePriceId: string;
}

export class SubscriptionPlansResponseDto {
  plans: SubscriptionPlanDto[];
  currentPlan?: SubscriptionResponseDto;
}

