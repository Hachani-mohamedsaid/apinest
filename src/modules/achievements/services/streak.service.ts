import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserStreak, UserStreakDocument } from '../schemas/user-streak.schema';
import { XpService } from './xp.service';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserStreak.name) private readonly streakModel: Model<UserStreakDocument>,
    private readonly xpService: XpService,
  ) {}

  /**
   * Update user streak based on activity date
   * @param userId User ID
   * @param activityDate Date of the activity
   */
  async updateStreak(userId: string, activityDate: Date): Promise<void> {
    try {
      // Normalize dates to day-level (ignore hours/minutes)
      const activityDay = this.normalizeToDay(activityDate);
      const today = this.normalizeToDay(new Date());

      // Get or create streak record
      let streak = await this.streakModel.findOne({ userId }).exec();
      if (!streak) {
        streak = new this.streakModel({
          userId,
          lastActivityDate: activityDay,
          currentStreak: 1,
          bestStreak: 1,
        });
        await streak.save();

        // Update user model
        await this.userModel.findByIdAndUpdate(userId, {
          currentStreak: 1,
          bestStreak: 1,
        }).exec();

        this.logger.log(`Initialized streak for user ${userId}: Day 1`);
        return;
      }

      const lastActivityDay = streak.lastActivityDate
        ? this.normalizeToDay(streak.lastActivityDate)
        : null;

      // Same day activity - don't change streak
      if (lastActivityDay && this.isSameDay(lastActivityDay, activityDay)) {
        this.logger.debug(`Same day activity for user ${userId}, streak unchanged`);
        return;
      }

      // Check if activity is next day (consecutive)
      const daysDifference = this.getDaysDifference(lastActivityDay || activityDay, activityDay);

      if (daysDifference === 1 || (lastActivityDay === null && daysDifference === 0)) {
        // Consecutive day - increment streak
        const newStreak = (streak.currentStreak || 0) + 1;
        streak.currentStreak = newStreak;
        streak.lastActivityDate = activityDay;

        // Update best streak if needed
        if (newStreak > streak.bestStreak) {
          streak.bestStreak = newStreak;
        }

        await streak.save();

        // Update user model
        await this.userModel.findByIdAndUpdate(userId, {
          currentStreak: newStreak,
          bestStreak: streak.bestStreak,
        }).exec();

        // Award streak bonus XP (5 XP × streak_days, but only for day 2+)
        if (newStreak > 1) {
          const bonusXp = XpService.XP_REWARDS.STREAK_BONUS * newStreak;
          await this.xpService.addXp(userId, bonusXp, 'streak_bonus');
          this.logger.log(`User ${userId} streak: ${newStreak} days, awarded ${bonusXp} XP bonus`);
        }
      } else if (daysDifference > 1) {
        // Streak broken - reset to 1
        streak.currentStreak = 1;
        streak.lastActivityDate = activityDay;
        await streak.save();

        // Update user model
        await this.userModel.findByIdAndUpdate(userId, {
          currentStreak: 1,
        }).exec();

        this.logger.log(`User ${userId} streak broken, reset to 1`);
      }
    } catch (error) {
      this.logger.error(`Error updating streak for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's streak data
   */
  async getStreak(userId: string): Promise<UserStreakDocument | null> {
    return this.streakModel.findOne({ userId }).exec();
  }

  /**
   * Normalize date to day-level (set hours/minutes/seconds to 0)
   */
  private normalizeToDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

