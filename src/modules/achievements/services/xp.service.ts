import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { LevelService } from './level.service';
import { LeaderboardService } from './leaderboard.service';
import { BadgeRarity } from '../schemas/badge-definition.schema';

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  // XP Rewards constants
  public static readonly XP_REWARDS = {
    COMPLETE_ACTIVITY: 50,
    HOST_EVENT: 100,
    JOIN_EVENT: 30,
    NEW_CONNECTION: 25,
    DAILY_LOGIN: 10,
    COMPLETE_CHALLENGE: 100, // Base, can vary
    EARN_BADGE: 75, // Base, multiplied by rarity
    STREAK_BONUS: 5, // Per day of streak
  };

  // Badge XP multipliers
  public static readonly BADGE_XP_MULTIPLIER = {
    [BadgeRarity.COMMON]: 1.0,
    [BadgeRarity.UNCOMMON]: 1.5,
    [BadgeRarity.RARE]: 2.0,
    [BadgeRarity.EPIC]: 3.0,
    [BadgeRarity.LEGENDARY]: 5.0,
  };

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly levelService: LevelService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Award XP to a user and update level/leaderboard
   * @param userId User ID
   * @param amount XP amount to add
   * @param source Source of XP (for logging)
   */
  async addXp(userId: string, amount: number, source: string): Promise<void> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        this.logger.warn(`User ${userId} not found when trying to add XP`);
        return;
      }

      const oldTotalXp = user.totalXp || 0;
      const newTotalXp = oldTotalXp + amount;

      // Update user XP
      user.totalXp = newTotalXp;

      // Calculate new level
      const levelInfo = this.levelService.calculateLevel(newTotalXp);
      user.currentLevel = levelInfo.level;

      await user.save();

      this.logger.log(
        `Added ${amount} XP to user ${userId} from ${source}. Total: ${newTotalXp}, Level: ${levelInfo.level}`,
      );

      // Update leaderboard rank
      await this.leaderboardService.updateUserRank(userId);
    } catch (error) {
      this.logger.error(`Error adding XP to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate badge XP reward based on rarity
   * @param rarity Badge rarity
   * @param baseXp Base XP (default: 75)
   * @returns Calculated XP reward
   */
  getBadgeXpReward(rarity: BadgeRarity, baseXp: number = XpService.XP_REWARDS.EARN_BADGE): number {
    const multiplier = XpService.BADGE_XP_MULTIPLIER[rarity] || 1.0;
    return Math.round(baseXp * multiplier);
  }
}

