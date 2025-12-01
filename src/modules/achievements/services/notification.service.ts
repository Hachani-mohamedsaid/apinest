import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../schemas/notification.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<NotificationDocument> {
    try {
      const notification = await this.notificationModel.create({
        userId: new Types.ObjectId(userId),
        type,
        title,
        message,
        metadata: metadata || {},
        isRead: false,
      });

      this.logger.debug(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      this.logger.error(`Error creating notification for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a badge unlocked notification
   */
  async createBadgeUnlockedNotification(
    userId: string,
    badgeName: string,
    badgeId: string,
    xpReward: number,
  ): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.BADGE_UNLOCKED,
      '🏆 Nouveau Badge Débloqué !',
      `Félicitations ! Vous avez débloqué le badge "${badgeName}" et gagné ${xpReward} XP !`,
      {
        badgeId,
        badgeName,
        xpReward,
      },
    );
  }

  /**
   * Create a level up notification
   */
  async createLevelUpNotification(
    userId: string,
    oldLevel: number,
    newLevel: number,
    totalXp: number,
  ): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.LEVEL_UP,
      '⬆️ Niveau Supérieur !',
      `Félicitations ! Vous êtes maintenant niveau ${newLevel} avec ${totalXp} XP total !`,
      {
        oldLevel,
        newLevel,
        totalXp,
      },
    );
  }

  /**
   * Create an XP earned notification (for significant XP gains)
   */
  async createXpEarnedNotification(
    userId: string,
    xpAmount: number,
    source: string,
    totalXp: number,
  ): Promise<void> {
    const sourceMessages: Record<string, string> = {
      complete_activity: `Activité complétée`,
      badge_reward: `Récompense de badge`,
      earn_badge: `Badge débloqué`,
      host_event: `Organisation d'activité`,
      join_event: `Participation à une activité`,
      challenge_completed: `Défi complété`,
      streak_bonus: `Bonus de série`,
    };

    const sourceMessage = sourceMessages[source] || source;

    await this.createNotification(
      userId,
      NotificationType.XP_EARNED,
      `+${xpAmount} XP !`,
      `Vous avez gagné ${xpAmount} XP en ${sourceMessage}. Total : ${totalXp} XP`,
      {
        xpAmount,
        source,
        totalXp,
      },
    );
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    types?: NotificationType[],
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (unreadOnly) {
      query.isRead = false;
    }
    if (types && types.length > 0) {
      query.type = { $in: types };
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
      this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }).exec(),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Alias for getUserNotifications for backward compatibility
   */
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    types?: NotificationType[],
  ): Promise<NotificationDocument[]> {
    const result = await this.getUserNotifications(userId, page, limit, unreadOnly, types);
    return result.notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationModel.updateOne(
      {
        _id: notificationId,
        userId: new Types.ObjectId(userId),
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    ).exec();
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    ).exec();
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    }).exec();

    return result.deletedCount || 0;
  }
}

