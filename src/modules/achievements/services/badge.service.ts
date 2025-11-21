import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadgeDefinition, BadgeDefinitionDocument } from '../schemas/badge-definition.schema';
import { UserBadge, UserBadgeDocument } from '../schemas/user-badge.schema';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';
import { UserStreak, UserStreakDocument } from '../schemas/user-streak.schema';
import { Activity, ActivityDocument } from '../../activities/schemas/activity.schema';
import { XpService } from './xp.service';
import { NotificationService } from './notification.service';

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
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(UserStreak.name)
    private readonly streakModel: Model<UserStreakDocument>,
    private readonly xpService: XpService,
    private readonly notificationService: NotificationService,
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
      this.logger.log(
        `[BadgeService] Checking badges for user ${userId}, triggerType: ${triggerType}`,
      );
      
      // Get all active badges
      const badges = await this.badgeDefinitionModel.find({ isActive: true }).exec();
      
      this.logger.log(
        `[BadgeService] Found ${badges.length} active badges to check`,
      );

      for (const badge of badges) {
        this.logger.debug(
          `[BadgeService] Checking badge: "${badge.name}" (id: ${badge._id}, criteriaType: ${badge.unlockCriteria?.type})`,
        );
        
        // Skip if user already has this badge
        const hasBadge = await this.userHasBadge(userId, badge._id.toString());
        if (hasBadge) {
          this.logger.debug(
            `[BadgeService] User ${userId} already has badge "${badge.name}", skipping`,
          );
          continue;
        }

        // Check if badge criteria is met
        const criteriaMet = await this.checkBadgeCriteria(userId, badge.unlockCriteria, context);
        
        this.logger.log(
          `[BadgeService] Badge "${badge.name}": criteriaMet=${criteriaMet}`,
        );
        
        if (criteriaMet) {
          this.logger.log(
            `[BadgeService] 🎉 Criteria met! Awarding badge "${badge.name}" to user ${userId}`,
          );
          await this.awardBadge(userId, badge._id.toString());
        } else {
          this.logger.debug(
            `[BadgeService] Criteria not met for badge "${badge.name}"`,
          );
        }
      }
      
      this.logger.log(
        `[BadgeService] ✅ Badge check completed for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `[BadgeService] ❌ ERROR checking badges for user ${userId}: ${error.message}`,
        error.stack,
      );
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

        case 'activity_creation_count':
        case 'host_events':
          // Utiliser la méthode améliorée qui gère les créations d'activité
          return await this.checkActivityCreationCount(userId, criteria, context);

        case 'distance_total':
          return await this.checkDistanceTotal(userId, criteria);

        case 'duration_total':
          return await this.checkDurationTotal(userId, criteria);

        case 'social_connections':
          return await this.checkSocialConnections(userId, criteria);

        case 'streak_days':
          return await this.checkStreakDays(userId, criteria);

        case 'combined':
          return await this.checkCombinedCriteria(userId, criteria);

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
   * Vérifie le nombre d'activités créées (en tant qu'hôte)
   * Utilise ActivityLog pour les activités complétées ET les activités en cours
   */
  private async checkHostEvents(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const requiredCount = criteria.count || 0;
    
    // Compter les activités où l'utilisateur est hôte (via ActivityLog)
    // Cela inclut les activités complétées où isHost = true
    const completedHostCount = await this.activityLogModel
      .countDocuments({ userId, isHost: true })
      .exec();
    
    // Note: Pour les activités créées mais non complétées,
    // on utilise le modèle Activity directement via le context si disponible
    // ou on compte uniquement les activités complétées
    
    // Si le context indique une création d'activité, on ajoute +1
    // Le comptage total inclut les activités complétées + la nouvelle création
    
    return completedHostCount >= requiredCount;
  }

  /**
   * Check activity creation count (for badges like "Premier Hôte")
   * Vérifie le nombre total d'activités créées par l'utilisateur
   * Compte à la fois les activités complétées (via ActivityLog) et non complétées (via Activity)
   */
  private async checkActivityCreationCount(
    userId: string,
    criteria: Record<string, any>,
    context?: Record<string, any>,
  ): Promise<boolean> {
    const requiredCount = criteria.count || 0;
    
    this.logger.log(
      `[BadgeService] checkActivityCreationCount: userId=${userId}, requiredCount=${requiredCount}, context.action=${context?.action}`,
    );
    
    // 1. Compter les activités complétées où l'utilisateur était hôte (via ActivityLog)
    const completedHostCount = await this.activityLogModel
      .countDocuments({ userId, isHost: true })
      .exec();
    
    this.logger.log(
      `[BadgeService] Completed host activities count: ${completedHostCount}`,
    );
    
    // 2. Compter les activités créées mais non encore complétées (via Activity model)
    // Ce sont les activités où creator = userId et isCompleted = false ou null
    const pendingActivitiesCount = await this.activityModel
      .countDocuments({ 
        creator: userId,
        $or: [
          { isCompleted: false },
          { isCompleted: { $exists: false } }
        ]
      })
      .exec();
    
    this.logger.log(
      `[BadgeService] Pending activities count: ${pendingActivitiesCount}`,
    );
    
    // 3. Total des activités créées = complétées + en attente
    const totalCreated = completedHostCount + pendingActivitiesCount;
    
    this.logger.log(
      `[BadgeService] Total activities created: ${totalCreated} (completed: ${completedHostCount} + pending: ${pendingActivitiesCount})`,
    );
    
    // 4. Si c'est une création d'activité en cours (dans le context), inclure cette nouvelle création
    if (context?.action === 'create_activity') {
      const totalWithNew = totalCreated + 1;
      this.logger.log(
        `[BadgeService] Including new activity: totalWithNew=${totalWithNew}, requiredCount=${requiredCount}`,
      );
      // Le badge sera débloqué si total + 1 >= requiredCount
      const result = totalWithNew >= requiredCount;
      this.logger.log(
        `[BadgeService] checkActivityCreationCount result: ${result} (${totalWithNew} >= ${requiredCount})`,
      );
      return result;
    }
    
    // Sinon, vérifier avec le total actuel
    const result = totalCreated >= requiredCount;
    this.logger.log(
      `[BadgeService] checkActivityCreationCount result: ${result} (${totalCreated} >= ${requiredCount})`,
    );
    return result;
  }

  /**
   * Check total distance criteria
   */
  private async checkDistanceTotal(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const requiredDistance = criteria.km || 0;
    const activityType = criteria.activity_type;

    const query: any = { userId };
    if (activityType && activityType !== 'any') {
      query.activityType = activityType;
    }

    const result = await this.activityLogModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalDistance: { $sum: '$distanceKm' } } },
    ]).exec();

    const totalDistance = result.length > 0 ? result[0].totalDistance || 0 : 0;
    return totalDistance >= requiredDistance;
  }

  /**
   * Check total duration criteria
   */
  private async checkDurationTotal(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const requiredDuration = criteria.minutes || 0;
    const activityType = criteria.activity_type;

    const query: any = { userId };
    if (activityType && activityType !== 'any') {
      query.activityType = activityType;
    }

    const result = await this.activityLogModel.aggregate([
      { $match: query },
      { $group: { _id: null, totalDuration: { $sum: '$durationMinutes' } } },
    ]).exec();

    const totalDuration = result.length > 0 ? result[0].totalDuration || 0 : 0;
    return totalDuration >= requiredDuration;
  }

  /**
   * Check combined criteria (all must be met)
   */
  private async checkCombinedCriteria(
    userId: string,
    criteria: Record<string, any>,
  ): Promise<boolean> {
    const subCriteria = criteria.criteria || [];
    if (!Array.isArray(subCriteria) || subCriteria.length === 0) {
      return false;
    }

    // Tous les critères doivent être remplis
    for (const subCriterion of subCriteria) {
      const isMet = await this.checkBadgeCriteria(userId, subCriterion);
      if (!isMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    try {
      this.logger.log(
        `[BadgeService] awardBadge called: userId=${userId}, badgeId=${badgeId}`,
      );
      
      // Check if already has badge
      const existing = await this.userBadgeModel.findOne({ userId, badgeId }).exec();
      if (existing) {
        this.logger.warn(
          `[BadgeService] User ${userId} already has badge ${badgeId}, skipping`,
        );
        return;
      }

      // Get badge definition for XP reward
      const badge = await this.badgeDefinitionModel.findById(badgeId).exec();
      if (!badge) {
        this.logger.warn(`[BadgeService] Badge ${badgeId} not found in database`);
        return;
      }

      this.logger.log(
        `[BadgeService] Badge found: "${badge.name}" (rarity: ${badge.rarity}, xpReward: ${badge.xpReward})`,
      );

      // Create user badge entry
      this.logger.log(
        `[BadgeService] Creating UserBadge entry for user ${userId}, badge ${badgeId}`,
      );
      
      await this.userBadgeModel.create({
        userId,
        badgeId,
        earnedAt: new Date(),
      });

      this.logger.log(
        `[BadgeService] ✅ UserBadge entry created successfully`,
      );

      // Award XP based on badge rarity
      const xpReward = this.xpService.getBadgeXpReward(badge.rarity, badge.xpReward);
      this.logger.log(
        `[BadgeService] Awarding ${xpReward} XP to user ${userId} for badge "${badge.name}"`,
      );
      
      await this.xpService.addXp(userId, xpReward, 'earn_badge');

      // Create notification for badge unlocked
      try {
        this.logger.log(
          `[BadgeService] Creating notification for badge unlock`,
        );
        
        await this.notificationService.createBadgeUnlockedNotification(
          userId,
          badge.name,
          badgeId,
          xpReward,
        );
        
        this.logger.log(
          `[BadgeService] ✅ Notification created successfully`,
        );
      } catch (error) {
        this.logger.warn(
          `[BadgeService] ⚠️ Failed to create notification for badge unlock: ${error.message}`,
        );
      }

      this.logger.log(
        `[BadgeService] 🎉 Badge "${badge.name}" successfully awarded to user ${userId} with ${xpReward} XP`,
      );
    } catch (error) {
      this.logger.error(
        `[BadgeService] ❌ ERROR awarding badge to user ${userId}: ${error.message}`,
        error.stack,
      );
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
    this.logger.debug(`[BadgeService] getUserBadges called for user ${userId}`);
    
    const userBadges = await this.userBadgeModel
      .find({ userId })
      .populate('badgeId')
      .sort({ earnedAt: -1 })
      .exec();
    
    this.logger.log(
      `[BadgeService] Found ${userBadges.length} badges for user ${userId}`,
    );
    
    if (userBadges.length > 0) {
      userBadges.forEach((ub: any) => {
        this.logger.debug(
          `[BadgeService] User badge: ${ub.badgeId?.name || 'Unknown'} (earnedAt: ${ub.earnedAt})`,
        );
      });
    }
    
    return userBadges;
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
      } else if (criteria.type === 'distance_total') {
        const query: any = { userId };
        if (criteria.activity_type && criteria.activity_type !== 'any') {
          query.activityType = criteria.activity_type;
        }
        const result = await this.activityLogModel.aggregate([
          { $match: query },
          { $group: { _id: null, totalDistance: { $sum: '$distanceKm' } } },
        ]).exec();
        currentProgress = result.length > 0 ? Math.round(result[0].totalDistance || 0) : 0;
        target = criteria.km || 0;
      } else if (criteria.type === 'duration_total') {
        const query: any = { userId };
        if (criteria.activity_type && criteria.activity_type !== 'any') {
          query.activityType = criteria.activity_type;
        }
        const result = await this.activityLogModel.aggregate([
          { $match: query },
          { $group: { _id: null, totalDuration: { $sum: '$durationMinutes' } } },
        ]).exec();
        currentProgress = result.length > 0 ? Math.round(result[0].totalDuration || 0) : 0;
        target = criteria.minutes || 0;
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

