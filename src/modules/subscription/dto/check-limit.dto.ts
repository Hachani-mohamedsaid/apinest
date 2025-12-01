export class CheckLimitResponseDto {
  canCreate: boolean;
  activitiesUsed: number;
  activitiesLimit: number;
  activitiesRemaining: number;
  subscriptionType: string;
  freeActivitiesRemaining: number;
  message?: string;
}

