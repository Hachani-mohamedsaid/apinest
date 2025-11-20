import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChallengeDefinition, ChallengeDefinitionDocument } from '../schemas/challenge-definition.schema';
import {
  UserChallenge,
  UserChallengeDocument,
  ChallengeStatus,
} from '../schemas/user-challenge.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';
import { XpService } from './xp.service';
import { BadgeService } from './badge.service';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    @InjectModel(ChallengeDefinition.name)
    private readonly challengeDefinitionModel: Model<ChallengeDefinitionDocument>,
    @InjectModel(UserChallenge.name)
    private readonly userChallengeModel: Model<UserChallengeDocument>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    private readonly xpService: XpService,
    private readonly badgeService: BadgeService,
  ) {}

  /**
   * Activate challenges for a user (create UserChallenge entries for active challenges)
   */
  async activateChallengesForUser(userId: string): Promise<void> {
    try {
      const now = new Date();
      const activeChallenges = await this.challengeDefinitionModel
        .find({
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
        })
        .exec();

      for (const challenge of activeChallenges) {
        // Check if user already has this challenge
        const existing = await this.userChallengeModel
          .findOne({ userId, challengeId: challenge._id })
          .exec();

        if (!existing) {
          await this.userChallengeModel.create({
            userId,
            challengeId: challenge._id,
            currentProgress: 0,
            targetCount: challenge.targetCount,
            status: ChallengeStatus.ACTIVE,
            startedAt: new Date(),
            expiresAt: challenge.endDate,
          });

          this.logger.log(`Activated challenge "${challenge.name}" for user ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error activating challenges for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Update challenge progress based on user action
   */
  async updateChallengeProgress(
    userId: string,
    actionType: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      // Get all active challenges for user
      const userChallenges = await this.userChallengeModel
        .find({
          userId,
          status: ChallengeStatus.ACTIVE,
        })
        .populate('challengeId')
        .exec();

      for (const userChallenge of userChallenges) {
        const challenge = userChallenge.challengeId as unknown as ChallengeDefinitionDocument;
        if (!challenge || !challenge._id) continue;

        // Check if this action counts toward the challenge
        const shouldCount = await this.doesActionCount(actionType, challenge.unlockCriteria, context);
        if (!shouldCount) {
          continue;
        }

        // Update progress based on challenge type
        const progressIncrement = await this.calculateProgressIncrement(
          actionType,
          challenge.unlockCriteria,
          context,
        );

        userChallenge.currentProgress = (userChallenge.currentProgress || 0) + progressIncrement;
        await userChallenge.save();

        // Check if challenge is completed
        if (userChallenge.currentProgress >= userChallenge.targetCount) {
          await this.completeChallenge(userChallenge);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating challenge progress for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Calculate how much progress to add based on challenge criteria
   */
  async calculateProgressIncrement(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<number> {
    const criteriaType = criteria.type;

    try {
      // Handle social connections separately (not related to activities)
      if (criteriaType === 'social_connections') {
        return actionType === 'new_connection' ? 1 : 0;
      }

      // For activity-related challenges, we need activity context
      if (actionType !== 'complete_activity' || !context || !context.activity) {
        return 0;
      }

      const activity = context.activity;

      switch (criteriaType) {
        case 'activities_in_period':
        case 'activity_count':
          // For activity count challenges, add 1 per activity
          return 1;

        case 'distance_in_period':
        case 'distance_total':
          // For distance challenges, add the distance of the activity
          return activity.distanceKm || 0;

        case 'duration_in_period':
        case 'duration_total':
          // For duration challenges, add the duration of the activity
          return activity.durationMinutes || 0;

        case 'sport_specific':
          // For specific sport challenges, check if it matches
          const requiredSport = criteria.sportType;
          if (activity.sportType === requiredSport) {
            return 1;
          }
          return 0;

        case 'sport_variety':
          return 1;

        default:
          return 0;
      }
    } catch (error) {
      this.logger.error(`Error calculating progress increment: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if an action counts toward challenge criteria
   */
  async doesActionCount(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<boolean> {
    const increment = await this.calculateProgressIncrement(actionType, criteria, context);
    return increment > 0;
  }

  /**
   * Check activities in period criteria
   */
  private async checkActivitiesInPeriod(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<boolean> {
    if (actionType !== 'complete_activity') {
      return false;
    }

    if (!context || !context.activity) {
      return false;
    }

    const activity = context.activity;
    const period = criteria.period;
    const activityTypes = criteria.activity_types || ['any'];

    // Check activity type
    if (!activityTypes.includes('any') && !activityTypes.includes(activity.sportType)) {
      return false;
    }

    // Check period
    const activityDate = new Date(activity.date || activity.time);
    const now = new Date();

    if (period === 'weekend') {
      const day = activityDate.getDay();
      return day === 0 || day === 6; // Saturday or Sunday
    } else if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return activityDate >= weekStart;
    } else if (period === 'month') {
      return (
        activityDate.getMonth() === now.getMonth() &&
        activityDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  }

  /**
   * Check sport variety criteria
   */
  private async checkSportVariety(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<boolean> {
    if (actionType !== 'complete_activity') {
      return false;
    }

    // This would require tracking different sports in a period
    // For now, we'll count any activity completion
    return true;
  }

  /**
   * Complete a challenge and award rewards
   */
  async completeChallenge(userChallenge: UserChallengeDocument): Promise<void> {
    try {
      userChallenge.status = ChallengeStatus.COMPLETED;
      userChallenge.completedAt = new Date();
      await userChallenge.save();

      const challenge = (await this.challengeDefinitionModel
        .findById(userChallenge.challengeId)
        .exec()) as ChallengeDefinitionDocument;

      if (!challenge) {
        return;
      }

      // Award XP
      await this.xpService.addXp(
        userChallenge.userId.toString(),
        challenge.xpReward,
        'complete_challenge',
      );

      // Award badge if applicable
      if (challenge.badgeRewardId) {
        await this.badgeService.awardBadge(
          userChallenge.userId.toString(),
          challenge.badgeRewardId.toString(),
        );
      }

      this.logger.log(
        `Challenge "${challenge.name}" completed by user ${userChallenge.userId}, awarded ${challenge.xpReward} XP`,
      );
    } catch (error) {
      this.logger.error(`Error completing challenge: ${error.message}`);
    }
  }

  /**
   * Get user's active challenges
   */
  async getUserActiveChallenges(userId: string): Promise<
    Array<{
      challenge: ChallengeDefinitionDocument;
      currentProgress: number;
      target: number;
      daysLeft: number;
      expiresAt: Date;
    }>
  > {
    const userChallenges = await this.userChallengeModel
      .find({
        userId,
        status: ChallengeStatus.ACTIVE,
      })
      .populate('challengeId')
      .exec();

    const result: Array<{
      challenge: ChallengeDefinitionDocument;
      currentProgress: number;
      target: number;
      daysLeft: number;
      expiresAt: Date;
    }> = [];

    for (const uc of userChallenges) {
      const challenge = uc.challengeId as unknown as ChallengeDefinitionDocument;
      if (!challenge || !challenge._id) continue;

      const now = new Date();
      const expiresAt = uc.expiresAt;
      const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      result.push({
        challenge,
        currentProgress: uc.currentProgress || 0,
        target: uc.targetCount,
        daysLeft,
        expiresAt,
      });
    }

    return result;
  }

  /**
   * Expire challenges that have passed their end date
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireChallenges(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.userChallengeModel
        .updateMany(
          {
            status: ChallengeStatus.ACTIVE,
            expiresAt: { $lt: now },
          },
          {
            $set: {
              status: ChallengeStatus.EXPIRED,
            },
          },
        )
        .exec();

      if (result.modifiedCount > 0) {
        this.logger.log(`Expired ${result.modifiedCount} challenges`);
      }
    } catch (error) {
      this.logger.error(`Error expiring challenges: ${error.message}`);
    }
  }
}

