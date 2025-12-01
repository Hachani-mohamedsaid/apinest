export class SubscriptionAnalyticsDto {
  totalActivitiesCreated: number;
  activitiesThisMonth: number;
  activitiesLastMonth: number;
  averageActivitiesPerMonth: number;
  totalParticipants: number;
  averageParticipantsPerActivity: number;
  revenueGenerated: number;
  averageRevenuePerActivity: number;
  fillRate: number; // % de remplissage
  currentPlan: string;
  planStartDate: Date;
  daysUntilRenewal?: number | null;
  chartData: {
    activitiesByMonth: Array<{
      month: string;
      count: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      amount: number;
    }>;
    participantsByMonth: Array<{
      month: string;
      count: number;
    }>;
  };
  topActivities: Array<{
    activityId: string;
    title: string;
    participants: number;
    revenue: number;
    date: Date;
  }>;
}

