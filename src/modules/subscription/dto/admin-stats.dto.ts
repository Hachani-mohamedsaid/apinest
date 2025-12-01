export class AdminSubscriptionStatsDto {
  totalSubscriptions: number;
  subscriptionsByType: {
    free: number;
    premium_normal: number;
    premium_gold: number;
    premium_platinum: number;
  };
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
}

