export class AchievementsSummaryDto {
  level: {
    currentLevel: number;
    totalXp: number;
    xpForNextLevel: number;
    currentLevelXp: number;
    progressPercentage: number;
  };
  stats: {
    totalBadges: number;
    currentStreak: number;
    bestStreak: number;
  };
}

