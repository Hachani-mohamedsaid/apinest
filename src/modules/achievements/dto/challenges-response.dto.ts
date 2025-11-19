export class ChallengeDto {
  _id: string;
  name: string;
  description: string;
  challengeType: string;
  xpReward: number;
  currentProgress: number;
  target: number;
  daysLeft: number;
  expiresAt: Date;
}

export class ChallengesResponseDto {
  activeChallenges: ChallengeDto[];
}

