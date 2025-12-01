export class SubscriptionRecommendationsDto {
  recommendedPlan?: string;
  reason: string;
  upgradeBenefits: Array<string>;
  currentUsage: {
    activitiesUsed: number;
    activitiesLimit: number;
    percentage: number;
  };
  marketInsights?: {
    averagePrice: number;
    yourAveragePrice: number;
    recommendation: 'increase' | 'decrease' | 'ok';
  };
}

