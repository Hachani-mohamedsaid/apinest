import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadgeDefinition, BadgeDefinitionDocument } from '../schemas/badge-definition.schema';
import { UserBadge, UserBadgeDocument } from '../schemas/user-badge.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';
import { UserStreak, UserStreakDocument } from '../schemas/user-streak.schema';
import { XpService } from './xp.service';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @InjectModel(BadgeDefinition.name)
    private readonly badgeDefinitionModel: Model<BadgeDefinitionDocument>,
    @InjectModel(UserBadge.name)
    private readonly userBadgeModel: Model<UserBadgeDocument>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    @InjectModel(UserStreak.name)
    private readonly streakModel: Model<UserStreakDocument>,
    private readonly xpService: XpService,
  ) {}

  /**
   * Check and award badges based on trigger type
   * @param userId User ID
   * @param triggerType Type of action that triggered the check
   * @param context Additional context (e.g., activity data)
   */
  async checkAndAwardBadges(
    userId: string,
    triggerType: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      // Get all active badges
      const badges = await this.badgeDefinitionModel.find({ isActive: true }).exec();

      for (const badge of badges) {
        // Skip if user already has this badge
        const hasBadge = await this.userHasBadge(userId, badge._id.toString());
        if (hasBadge) {
          continue;
        }

        // Check if badge criteria is met
        const criteriaMet = await this.checkBadgeCriteria(userId, badge.unlockCriteria, context);
        if (criteriaMet) {
          await this.awardBadge(userId, badge._id.toString());
        }
      }
    } catch (error) {
      this.logger.error(`Error checking badges for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Check if badge criteria is met
   */
  async checkBadgeCriteria(
    userId: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<boolean> {
    const criteriaType = criteria.type;

    try {
      switch (criteriaType) {
        case 'activity_count':
          return await this.checkActivityCount(userId, criteria);

        case 'social_connections':
          return await this.checkSocialConnections(userId, criteria);

        case 'streak_days':
          return await this.checkStreakDays(userId, criteria);

        case 'host_events':
          return await this.checkHostEvents(userId, criteria);

        default:
          this.logger.warn(`Unknown badge criteria type: ${criteriaType}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error checking badge criteria: ${error.message}`);
      return false;
    }
  }

  /**
   * Check activity count criteria
   */
  private async checkActivityCount(
    userId: string,
    criteria: Record<string, any>,
  ): Promise<boolean> {
    const requiredCount = criteria.count || 0;
    const activityType = criteria.activity_type;

    const query: any = { userId };
    if (activityType && activityType !== 'any') {
      query.activityType = activityType;
    }

    const count = await this.activityLogModel.countDocuments(query).exec();
    return count >= requiredCount;
  }

  /**
   * Check social connections criteria
   * Note: This assumes connections are tracked elsewhere. For now, we'll use a placeholder.
   */
  private async checkSocialConnections(
    userId: string,
    criteria: Record<string, any>,
  ): Promise<boolean> {
    // TODO: Implement connection counting when connection system is available
    // For now, return false
    this.logger.debug('Social connections check not yet implemented');
    return false;
  }

  /**
   * Check streak days criteria
   */
  private async checkStreakDays(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const requiredDays = criteria.days || 0;
    const streak = await this.streakModel.findOne({ userId }).exec();
    return streak ? (streak.currentStreak || 0) >= requiredDays : false;
  }

  /**
   * Check host events criteria
   */
  private async checkHostEvents(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const requiredCount = criteria.count || 0;
    const count = await this.activityLogModel
      .countDocuments({ userId, isHost: true })
      .exec();
    return count >= requiredCount;
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    try {
      // Check if already has badge
      const existing = await this.userBadgeModel.findOne({ userId, badgeId }).exec();
      if (existing) {
        return;
      }

      // Get badge definition for XP reward
      const badge = await this.badgeDefinitionModel.findById(badgeId).exec();
      if (!badge) {
        this.logger.warn(`Badge ${badgeId} not found`);
        return;
      }

      // Create user badge entry
      await this.userBadgeModel.create({
        userId,
        badgeId,
        earnedAt: new Date(),
      });

      // Award XP based on badge rarity
      const xpReward = this.xpService.getBadgeXpReward(badge.rarity, badge.xpReward);
      await this.xpService.addXp(userId, xpReward, 'earn_badge');

      this.logger.log(`Badge "${badge.name}" awarded to user ${userId} with ${xpReward} XP`);
    } catch (error) {
      this.logger.error(`Error awarding badge to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user has a badge
   */
  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    const userBadge = await this.userBadgeModel.findOne({ userId, badgeId }).exec();
    return !!userBadge;
  }

  /**
   * Get all badges earned by user
   */
  async getUserBadges(userId: string): Promise<UserBadgeDocument[]> {
    return this.userBadgeModel
      .find({ userId })
      .populate('badgeId')
      .sort({ earnedAt: -1 })
      .exec();
  }

  /**
   * Get badge progress for unearned badges
   */
  async getBadgeProgress(userId: string): Promise<
    Array<{
      badge: BadgeDefinitionDocument;
      currentProgress: number;
      target: number;
      percentage: number;
    }>
  > {
    const allBadges = await this.badgeDefinitionModel.find({ isActive: true }).exec();
    const userBadges = await this.getUserBadges(userId);
    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId.toString()));

    const progress: Array<{
      badge: BadgeDefinitionDocument;
      currentProgress: number;
      target: number;
      percentage: number;
    }> = [];

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge._id.toString())) {
        continue; // Skip earned badges
      }

      const criteria = badge.unlockCriteria;
      let currentProgress = 0;
      let target = 0;

      if (criteria.type === 'activity_count') {
        const query: any = { userId };
        if (criteria.activity_type && criteria.activity_type !== 'any') {
          query.activityType = criteria.activity_type;
        }
        currentProgress = await this.activityLogModel.countDocuments(query).exec();
        target = criteria.count || 0;
      } else if (criteria.type === 'streak_days') {
        const streak = await this.streakModel.findOne({ userId }).exec();
        currentProgress = streak ? streak.currentStreak || 0 : 0;
        target = criteria.days || 0;
      } else if (criteria.type === 'host_events') {
        currentProgress = await this.activityLogModel
          .countDocuments({ userId, isHost: true })
          .exec();
        target = criteria.count || 0;
      }

      const percentage = target > 0 ? Math.min(100, Math.round((currentProgress / target) * 100)) : 0;

      progress.push({
        badge,
        currentProgress,
        target,
        percentage,
      });
    }

    return progress;
  }
}

