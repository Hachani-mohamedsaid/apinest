import { SubscriptionType, SubscriptionStatus } from '../subscription.schema';

export class SubscriptionFeaturesDto {
  maxActivitiesPerMonth: number;
  unlimitedActivities: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  featuredListing: boolean;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  activitiesUsedThisMonth: number;
  activitiesLimit: number;
  activitiesRemaining: number;
  freeActivitiesRemaining: number;
  isCoachVerified: boolean;
  monthlyPrice: number;
  currency: string;
  features: SubscriptionFeaturesDto;
}

