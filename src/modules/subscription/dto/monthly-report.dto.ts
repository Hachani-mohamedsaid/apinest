export class MonthlyReportDto {
  month: string;
  year: number;
  summary: {
    activitiesCreated: number;
    totalParticipants: number;
    totalRevenue: number;
    averageRating: number;
    fillRate: number;
  };
  activities: Array<{
    id: string;
    title: string;
    date: Date;
    participants: number;
    revenue: number;
    rating?: number;
  }>;
  chartData: {
    activitiesByWeek: Array<{ week: string; count: number }>;
    revenueByWeek: Array<{ week: string; amount: number }>;
  };
  insights: Array<string>;
  recommendations: Array<string>;
}

