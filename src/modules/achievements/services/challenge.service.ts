import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChallengeDefinition, ChallengeDefinitionDocument, ChallengeType } from '../schemas/challenge-definition.schema';
import {
  UserChallenge,
  UserChallengeDocument,
  ChallengeStatus,
} from '../schemas/user-challenge.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { XpService } from './xp.service';
import { BadgeService } from './badge.service';
import { NotificationService } from './notification.service';
import { NotificationType } from '../schemas/notification.schema';

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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly xpService: XpService,
    private readonly badgeService: BadgeService,
    private readonly notificationService: NotificationService,
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
      this.logger.log(
        `[ChallengeService] Updating challenge progress for user ${userId}, action: ${actionType}`,
      );

      // Get all active challenges for user
      const userChallenges = await this.userChallengeModel
        .find({
          userId,
          status: ChallengeStatus.ACTIVE,
        })
        .populate('challengeId')
        .exec();

      this.logger.log(
        `[ChallengeService] Found ${userChallenges.length} active challenges for user ${userId}`,
      );

      if (context?.activity) {
        this.logger.debug(
          `[ChallengeService] Activity data: sportType=${context.activity.sportType}, date=${context.activity.date}, completedAt=${context.activity.completedAt}`,
        );
      }

      for (const userChallenge of userChallenges) {
        const challenge = userChallenge.challengeId as unknown as ChallengeDefinitionDocument;
        if (!challenge || !challenge._id) {
          this.logger.warn(`[ChallengeService] Challenge definition not found for userChallenge ${userChallenge._id}`);
          continue;
        }

        this.logger.debug(
          `[ChallengeService] Processing challenge: "${challenge.name}" (type: ${challenge.challengeType || 'unknown'})`,
        );

        // Check if this action counts toward the challenge
        // Pass challengeType to help with period checking
        this.logger.log(
          `[ChallengeService] Checking if challenge "${challenge.name}" counts for action ${actionType}`,
        );
        this.logger.log(
          `[ChallengeService] Challenge unlockCriteria: ${JSON.stringify(challenge.unlockCriteria)}`,
        );
        this.logger.log(
          `[ChallengeService] Challenge challengeType: ${challenge.challengeType}`,
        );
        
        const shouldCount = await this.doesActionCount(
          actionType,
          challenge.unlockCriteria,
          context,
          challenge.challengeType,
        );
        
        this.logger.log(
          `[ChallengeService] shouldCount result for "${challenge.name}": ${shouldCount}`,
        );
        
        if (!shouldCount) {
          this.logger.warn(
            `[ChallengeService] Challenge "${challenge.name}" does NOT count for action ${actionType} (user ${userId})`,
          );
          this.logger.warn(
            `[ChallengeService] Reason: doesActionCount returned false. Check unlockCriteria and period matching.`,
          );
          continue;
        }

        // Update progress based on challenge type
        const oldProgress = userChallenge.currentProgress || 0;
        this.logger.log(
          `[ChallengeService] Current progress for "${challenge.name}": ${oldProgress}/${userChallenge.targetCount}`,
        );
        
        const progressIncrement = await this.calculateProgressIncrement(
          actionType,
          challenge.unlockCriteria,
          context,
          challenge.challengeType,
        );

        this.logger.log(
          `[ChallengeService] Calculated progress increment for "${challenge.name}": ${progressIncrement}`,
        );

        if (progressIncrement > 0) {
          const newProgress = oldProgress + progressIncrement;
          userChallenge.currentProgress = newProgress;
          
          this.logger.log(
            `[ChallengeService] Saving challenge progress: ${oldProgress} -> ${newProgress}`,
          );
          
          try {
            await userChallenge.save();
            this.logger.log(
              `[ChallengeService] ✅ Challenge progress SAVED successfully for user ${userId}: "${challenge.name}" - ${oldProgress} -> ${newProgress}/${userChallenge.targetCount}`,
            );
          } catch (saveError) {
            this.logger.error(
              `[ChallengeService] ❌ ERROR saving challenge progress: ${saveError.message}`,
              saveError.stack,
            );
            throw saveError;
          }

          // Check if challenge is completed
          if (userChallenge.currentProgress >= userChallenge.targetCount) {
            this.logger.log(
              `[ChallengeService] 🎉 Challenge "${challenge.name}" COMPLETED for user ${userId}!`,
            );
            await this.completeChallenge(userChallenge);
          }
        } else {
          this.logger.warn(
            `[ChallengeService] ⚠️ No progress increment for challenge "${challenge.name}" (increment: ${progressIncrement})`,
          );
          this.logger.warn(
            `[ChallengeService] This means calculateProgressIncrement returned 0. Check period matching or criteria type.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[ChallengeService] Error updating challenge progress for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate how much progress to add based on challenge criteria
   */
  async calculateProgressIncrement(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
    challengeType?: string,
  ): Promise<number> {
    const criteriaType = criteria?.type;

    this.logger.log(
      `[ChallengeService] calculateProgressIncrement called: actionType=${actionType}, criteriaType=${criteriaType}, challengeType=${challengeType}`,
    );

    try {
      // Handle social connections separately (not related to activities)
      if (criteriaType === 'social_connections') {
        this.logger.debug(`[ChallengeService] Social connections criteria, returning ${actionType === 'new_connection' ? 1 : 0}`);
        return actionType === 'new_connection' ? 1 : 0;
      }

      // For activity-related challenges, we need activity context
      if (actionType !== 'complete_activity') {
        this.logger.warn(
          `[ChallengeService] Action type mismatch: expected 'complete_activity', got '${actionType}'`,
        );
        return 0;
      }

      if (!context || !context.activity) {
        this.logger.warn(
          `[ChallengeService] Missing activity context: context=${!!context}, context.activity=${!!context?.activity}`,
        );
        return 0;
      }

      const activity = context.activity;
      this.logger.log(
        `[ChallengeService] Activity data: sportType=${activity.sportType}, date=${activity.date}, completedAt=${activity.completedAt}`,
      );

      switch (criteriaType) {
        case 'activities_in_period':
          this.logger.log(
            `[ChallengeService] Processing 'activities_in_period' criteria`,
          );
          // For period-based challenges, verify the activity is in the correct period
          const periodMatches = await this.checkActivitiesInPeriod(
            actionType,
            criteria,
            context,
            challengeType,
          );
          this.logger.log(
            `[ChallengeService] Period check result for 'activities_in_period': ${periodMatches}`,
          );
          if (!periodMatches) {
            this.logger.warn(
              `[ChallengeService] ❌ Period check FAILED for activities_in_period challenge (challengeType: ${challengeType})`,
            );
            this.logger.warn(
              `[ChallengeService] Activity date does not match challenge period requirement`,
            );
            return 0;
          }
          // If period matches, add 1 per activity
          this.logger.log(
            `[ChallengeService] ✅ Period check PASSED, returning increment: 1`,
          );
          return 1;

        case 'activity_count':
          // For activity count challenges (no period restriction), add 1 per activity
          return 1;

        case 'distance_in_period':
          // For distance challenges with period, verify period first
          const distancePeriodMatches = await this.checkActivitiesInPeriod(
            actionType,
            criteria,
            context,
            challengeType,
          );
          if (!distancePeriodMatches) {
            return 0;
          }
          return activity.distanceKm || 0;

        case 'distance_total':
          // For total distance challenges (no period restriction), add the distance
          return activity.distanceKm || 0;

        case 'duration_in_period':
          // For duration challenges with period, verify period first
          const durationPeriodMatches = await this.checkActivitiesInPeriod(
            actionType,
            criteria,
            context,
            challengeType,
          );
          if (!durationPeriodMatches) {
            return 0;
          }
          return activity.durationMinutes || 0;

        case 'duration_total':
          // For total duration challenges (no period restriction), add the duration
          return activity.durationMinutes || 0;

        case 'sport_specific':
          // For specific sport challenges, check if it matches
          const requiredSport = criteria.sportType;
          if (activity.sportType === requiredSport) {
            // Also check period if specified
            if (criteria.period || challengeType) {
              const sportPeriodMatches = await this.checkActivitiesInPeriod(
                actionType,
                criteria,
                context,
                challengeType,
              );
              if (!sportPeriodMatches) {
                return 0;
              }
            }
            return 1;
          }
          return 0;

        case 'sport_variety':
          return 1;

        default:
          this.logger.warn(
            `[ChallengeService] Unknown criteria type: ${criteriaType}`,
          );
          this.logger.warn(
            `[ChallengeService] Available criteria types: activities_in_period, activity_count, distance_in_period, duration_in_period, sport_specific, sport_variety`,
          );
          return 0;
      }
    } catch (error) {
      this.logger.error(
        `[ChallengeService] ❌ ERROR calculating progress increment: ${error.message}`,
        error.stack,
      );
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
    challengeType?: string,
  ): Promise<boolean> {
    this.logger.log(
      `[ChallengeService] doesActionCount called: actionType=${actionType}, criteriaType=${criteria?.type}, challengeType=${challengeType}`,
    );
    
    const increment = await this.calculateProgressIncrement(
      actionType,
      criteria,
      context,
      challengeType,
    );
    
    const result = increment > 0;
    this.logger.log(
      `[ChallengeService] doesActionCount result: increment=${increment}, returns=${result}`,
    );
    
    return result;
  }

  /**
   * Check activities in period criteria
   * Verifies if an activity matches the period requirement (day, week, month, etc.)
   */
  private async checkActivitiesInPeriod(
    actionType: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
    challengeType?: string,
  ): Promise<boolean> {
    this.logger.log(
      `[ChallengeService] checkActivitiesInPeriod called: actionType=${actionType}, challengeType=${challengeType}`,
    );
    
    if (actionType !== 'complete_activity') {
      this.logger.warn(
        `[ChallengeService] Action type is not 'complete_activity': ${actionType}`,
      );
      return false;
    }

    if (!context || !context.activity) {
      this.logger.warn(
        `[ChallengeService] Missing context or activity: context=${!!context}, activity=${!!context?.activity}`,
      );
      return false;
    }

    const activity = context.activity;
    // Use challengeType from ChallengeDefinition if not in criteria
    const period = criteria.period || challengeType || 'any';
    const activityTypes = criteria.activity_types || ['any'];

    this.logger.log(
      `[ChallengeService] Period check parameters: period=${period}, challengeType=${challengeType}, criteria.period=${criteria.period}, activityTypes=${JSON.stringify(activityTypes)}`,
    );

    // Check activity type if specified
    if (activityTypes && !activityTypes.includes('any') && !activityTypes.includes(activity.sportType)) {
      this.logger.warn(
        `[ChallengeService] Activity type mismatch: activity.sportType=${activity.sportType}, required types=${JSON.stringify(activityTypes)}`,
      );
      return false;
    }

    // Get activity date - prioritize completedAt (date of completion) for daily challenges
    // For daily challenges, we need the completion date, not the creation date
    const activityDateSource = activity.completedAt || activity.date || activity.time || new Date();
    const activityDate = new Date(activityDateSource);
    const now = new Date();

    this.logger.log(
      `[ChallengeService] Date check: activityDateSource=${activityDateSource}, activityDate=${activityDate.toISOString()}, now=${now.toISOString()}`,
    );

    // Check period based on challenge type or period field
    if (period === 'day' || period === 'daily' || period === 'today') {
      // Daily challenge: activity must be from today
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);
      const isToday = activityDay.getTime() === today.getTime();
      
      this.logger.log(
        `[ChallengeService] 📅 Daily period check:`,
      );
      this.logger.log(
        `[ChallengeService]   - today (normalized): ${today.toISOString()}`,
      );
      this.logger.log(
        `[ChallengeService]   - activityDay (normalized): ${activityDay.toISOString()}`,
      );
      this.logger.log(
        `[ChallengeService]   - today timestamp: ${today.getTime()}`,
      );
      this.logger.log(
        `[ChallengeService]   - activityDay timestamp: ${activityDay.getTime()}`,
      );
      this.logger.log(
        `[ChallengeService]   - match: ${isToday}`,
      );
      
      if (!isToday) {
        this.logger.warn(
          `[ChallengeService] ❌ Daily challenge FAILED: Activity was not completed today`,
        );
        this.logger.warn(
          `[ChallengeService] Activity date: ${activityDay.toISOString()}, Today: ${today.toISOString()}`,
        );
      } else {
        this.logger.log(
          `[ChallengeService] ✅ Daily challenge PASSED: Activity was completed today`,
        );
      }
      
      return isToday;
    } else if (period === 'week' || period === 'weekly') {
      // Weekly challenge: activity must be from current week
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);
      return activityDay >= weekStart;
    } else if (period === 'month' || period === 'monthly') {
      // Monthly challenge: activity must be from current month
      return (
        activityDate.getMonth() === now.getMonth() &&
        activityDate.getFullYear() === now.getFullYear()
      );
    } else if (period === 'weekend') {
      // Weekend challenge: activity must be on Saturday or Sunday
      const day = activityDate.getDay();
      return day === 0 || day === 6;
    }

    // If no period specified or period is 'any', accept all activities
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

      // Create notification for challenge completion
      try {
        await this.notificationService.createNotification(
          userChallenge.userId.toString(),
          NotificationType.CHALLENGE_COMPLETED,
          '🎯 Défi Complété !',
          `Félicitations ! Vous avez complété le défi "${challenge.name}" et gagné ${challenge.xpReward} XP !`,
          {
            challengeId: challenge._id.toString(),
            challengeName: challenge.name,
            xpReward: challenge.xpReward || 0,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to create challenge completion notification: ${error.message}`);
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

  /**
   * Create daily challenges for all active users
   * Runs every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createDailyChallenges(): Promise<void> {
    try {
      this.logger.log('Creating daily challenges for all users...');

      // Find or create daily challenge definition
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Check if daily challenge definition exists
      let dailyChallengeDef = await this.challengeDefinitionModel
        .findOne({
          name: 'Défi Quotidien',
          challengeType: ChallengeType.DAILY,
          isActive: true,
        })
        .exec();

      if (!dailyChallengeDef) {
        // Create daily challenge definition
        dailyChallengeDef = await this.challengeDefinitionModel.create({
          name: 'Défi Quotidien',
          description: "Compléter 2 activités aujourd'hui",
          challengeType: ChallengeType.DAILY,
          xpReward: 200,
          targetCount: 2,
          unlockCriteria: {
            type: 'activities_in_period',
            period: 'day',
            count: 2,
          },
          startDate: now,
          endDate: tomorrow,
          isActive: true,
        });

        this.logger.log('Daily challenge definition created');
      }

      // Get all users (you might want to filter for active users only)
      const users = await this.userModel.find({}).select('_id').exec();

      let activatedCount = 0;
      for (const user of users) {
        await this.activateChallengesForUser(user._id.toString());
        activatedCount++;
      }

      this.logger.log(`Daily challenges activated for ${activatedCount} users`);
    } catch (error) {
      this.logger.error(`Error creating daily challenges: ${error.message}`);
    }
  }

  /**
   * Create weekly challenges for all active users
   * Runs every Monday at midnight
   */
  @Cron('0 0 * * 1') // Every Monday at midnight
  async createWeeklyChallenges(): Promise<void> {
    try {
      this.logger.log('Creating weekly challenges for all users...');

      const now = new Date();
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(23, 59, 59, 999);

      let weeklyChallengeDef = await this.challengeDefinitionModel
        .findOne({
          name: 'Défi Hebdomadaire',
          challengeType: ChallengeType.WEEKLY,
          isActive: true,
        })
        .exec();

      if (!weeklyChallengeDef) {
        weeklyChallengeDef = await this.challengeDefinitionModel.create({
          name: 'Défi Hebdomadaire',
          description: 'Compléter 5 activités cette semaine',
          challengeType: ChallengeType.WEEKLY,
          xpReward: 500,
          targetCount: 5,
          unlockCriteria: {
            type: 'activities_in_period',
            period: 'week',
            count: 5,
          },
          startDate: now,
          endDate: nextMonday,
          isActive: true,
        });

        this.logger.log('Weekly challenge definition created');
      }

      const users = await this.userModel.find({}).select('_id').exec();

      let activatedCount = 0;
      for (const user of users) {
        await this.activateChallengesForUser(user._id.toString());
        activatedCount++;
      }

      this.logger.log(`Weekly challenges activated for ${activatedCount} users`);
    } catch (error) {
      this.logger.error(`Error creating weekly challenges: ${error.message}`);
    }
  }

  /**
   * Create monthly challenges for all active users
   * Runs on the 1st of each month at midnight
   */
  @Cron('0 0 1 * *') // 1st of each month at midnight
  async createMonthlyChallenges(): Promise<void> {
    try {
      this.logger.log('Creating monthly challenges for all users...');

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      nextMonth.setHours(23, 59, 59, 999);

      let monthlyChallengeDef = await this.challengeDefinitionModel
        .findOne({
          name: 'Marathon Mensuel',
          challengeType: ChallengeType.MONTHLY,
          isActive: true,
        })
        .exec();

      if (!monthlyChallengeDef) {
        monthlyChallengeDef = await this.challengeDefinitionModel.create({
          name: 'Marathon Mensuel',
          description: 'Compléter 20 activités ce mois',
          challengeType: ChallengeType.MONTHLY,
          xpReward: 1500,
          targetCount: 20,
          unlockCriteria: {
            type: 'activities_in_period',
            period: 'month',
            count: 20,
          },
          startDate: now,
          endDate: nextMonth,
          isActive: true,
        });

        this.logger.log('Monthly challenge definition created');
      }

      const users = await this.userModel.find({}).select('_id').exec();

      let activatedCount = 0;
      for (const user of users) {
        await this.activateChallengesForUser(user._id.toString());
        activatedCount++;
      }

      this.logger.log(`Monthly challenges activated for ${activatedCount} users`);
    } catch (error) {
      this.logger.error(`Error creating monthly challenges: ${error.message}`);
    }
  }
}

