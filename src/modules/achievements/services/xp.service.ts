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
    BASE_ACTIVITY: 10, // XP de base pour toute activité
    DURATION_PER_MINUTE: 0.5, // XP par minute d'exercice
    DISTANCE_PER_KM: 2, // XP par kilomètre parcouru
    HOST_EVENT: 100,
    JOIN_EVENT: 30,
    NEW_CONNECTION: 25,
    DAILY_LOGIN: 10,
    COMPLETE_CHALLENGE: 100, // Base, can vary
    EARN_BADGE: 75, // Base, multiplied by rarity
    STREAK_BONUS: 5, // Per day of streak
  };

  // Activity type multipliers (multiplicateur selon le type d'activité)
  public static readonly ACTIVITY_TYPE_MULTIPLIER: Record<string, number> = {
    Swimming: 1.5, // Natation (plus difficile)
    Natation: 1.5,
    Running: 1.2, // Course
    'Course à pied': 1.2,
    Football: 1.2,
    Basketball: 1.2,
    Cycling: 1.0, // Vélo (activité standard)
    Vélo: 1.0,
    Yoga: 1.0,
    'Hiking': 1.0, // Randonnée
    'Randonnée': 1.0,
    'default': 1.0, // Par défaut
  };

  // Badge XP multipliers
  public static readonly BADGE_XP_MULTIPLIER = {
    [BadgeRarity.COMMON]: 1.0,
    [BadgeRarity.UNCOMMON]: 1.5,
    [BadgeRarity.RARE]: 2.0,
    [BadgeRarity.EPIC]: 3.0,
    [BadgeRarity.LEGENDARY]: 5.0,
  };

  /**
   * Calculate XP earned for an activity based on detailed formula
   * Formula: (Base XP + Duration Bonus + Distance Bonus) × Activity Type Multiplier
   * 
   * @param activityType Type of activity (e.g., "Running", "Swimming")
   * @param durationMinutes Duration of activity in minutes
   * @param distanceKm Distance covered in kilometers (optional)
   * @returns Calculated XP amount
   */
  calculateActivityXp(
    activityType: string,
    durationMinutes: number,
    distanceKm?: number,
  ): number {
    // XP de base
    const baseXp = XpService.XP_REWARDS.BASE_ACTIVITY;

    // Bonus durée (0.5 XP par minute)
    const durationBonus = durationMinutes * XpService.XP_REWARDS.DURATION_PER_MINUTE;

    // Bonus distance (2 XP par km, si applicable)
    const distanceBonus = distanceKm ? distanceKm * XpService.XP_REWARDS.DISTANCE_PER_KM : 0;

    // Total avant multiplicateur
    const totalBeforeMultiplier = baseXp + durationBonus + distanceBonus;

    // Multiplicateur selon le type d'activité
    const multiplier =
      XpService.ACTIVITY_TYPE_MULTIPLIER[activityType] ||
      XpService.ACTIVITY_TYPE_MULTIPLIER['default'];

    // Calcul final
    const finalXp = Math.round(totalBeforeMultiplier * multiplier);

    this.logger.debug(
      `Calculated XP for ${activityType}: Base(${baseXp}) + Duration(${durationBonus.toFixed(1)}) + Distance(${distanceBonus}) = ${totalBeforeMultiplier.toFixed(1)} × ${multiplier} = ${finalXp}`,
    );

    return finalXp;
  }

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

