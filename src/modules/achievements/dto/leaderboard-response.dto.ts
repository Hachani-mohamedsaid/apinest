export class LeaderboardEntryDto {
  rank: number;
  username: string;
  totalXp: number;
  medal?: string;
}

export class CurrentUserLeaderboardDto {
  rank: number;
  username: string;
  totalXp: number;
  isCurrentUser: boolean;
}

export class LeaderboardResponseDto {
  currentUser?: CurrentUserLeaderboardDto;
  leaderboard: LeaderboardEntryDto[];
  page: number;
  totalPages: number;
}

