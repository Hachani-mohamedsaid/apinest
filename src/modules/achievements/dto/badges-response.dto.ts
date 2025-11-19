export class BadgeDto {
  _id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: string;
  category: string;
  earnedAt: Date;
}

export class BadgeProgressDto {
  badge: {
    _id: string;
    name: string;
    description: string;
    iconUrl: string;
    rarity: string;
    category: string;
  };
  currentProgress: number;
  target: number;
  percentage: number;
}

export class BadgesResponseDto {
  earnedBadges: BadgeDto[];
  inProgress: BadgeProgressDto[];
}

