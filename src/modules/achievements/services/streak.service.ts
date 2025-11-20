import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserStreak, UserStreakDocument } from '../schemas/user-streak.schema';
import { XpService } from './xp.service';
import { BadgeService } from './badge.service';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserStreak.name) private readonly streakModel: Model<UserStreakDocument>,
    private readonly xpService: XpService,
    @Inject(forwardRef(() => BadgeService))
    private readonly badgeService: BadgeService,
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

        // Vérifier les badges de série après la mise à jour
        await this.badgeService.checkAndAwardBadges(userId, 'streak_updated', {
          streak: newStreak,
        });
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

  /**
   * Check and expire streaks for users who haven't been active for more than 1 day
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireStreaks(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      // Find all users with active streaks (currentStreak > 0)
      const activeStreaks = await this.streakModel
        .find({ currentStreak: { $gt: 0 } })
        .exec();

      let expiredCount = 0;

      for (const streak of activeStreaks) {
        const lastActivityDate = streak.lastActivityDate;
        
        if (!lastActivityDate) {
          // Pas de date d'activité = streak invalide, remettre à 0
          streak.currentStreak = 0;
          await streak.save();
          
          await this.userModel.findByIdAndUpdate(streak.userId, {
            currentStreak: 0,
          }).exec();
          
          expiredCount++;
          continue;
        }

        // Vérifier si la dernière activité date d'avant-hier ou plus
        const normalizedLastActivity = this.normalizeToDay(lastActivityDate);
        const normalizedYesterday = this.normalizeToDay(yesterday);
        const daysSinceLastActivity = this.getDaysDifference(normalizedLastActivity, normalizedYesterday);

        // Si 2+ jours sans activité, la série est cassée
        if (daysSinceLastActivity >= 2) {
          streak.currentStreak = 0;
          await streak.save();

          await this.userModel.findByIdAndUpdate(streak.userId, {
            currentStreak: 0,
          }).exec();

          expiredCount++;
          this.logger.log(
            `Expired streak for user ${streak.userId.toString()}, last activity: ${lastActivityDate}`,
          );
        }
      }

      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} streaks at midnight check`);
      }
    } catch (error) {
      this.logger.error(`Error expiring streaks: ${error.message}`);
    }
  }
}

