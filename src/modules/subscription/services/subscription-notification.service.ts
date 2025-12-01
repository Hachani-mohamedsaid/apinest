import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../subscription.schema';
import { NotificationService } from '../../achievements/services/notification.service';
import { NotificationType } from '../../achievements/schemas/notification.schema';

@Injectable()
export class SubscriptionNotificationService {
  private readonly logger = new Logger(SubscriptionNotificationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Envoie une notification de limite atteinte
   */
  async sendLimitWarningNotification(userId: string, percentage: number) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    const messages: { [key: number]: string } = {
      80: "You've used 80% of your monthly activity limit. Consider upgrading!",
      90: "You've used 90% of your monthly activity limit. Upgrade now!",
      100: "You've reached your monthly activity limit. Upgrade to create more activities!",
    };

    // Envoyer notification in-app
    await this.notificationService.createNotification(
      userId,
      NotificationType.SUBSCRIPTION_LIMIT_WARNING,
      "Activity Limit Warning",
      messages[percentage] || `You've used ${percentage}% of your monthly limit.`,
      {
        percentage,
        actionUrl: "/premium",
      },
    );

    this.logger.log(`Limit warning sent to user ${userId}: ${percentage}%`);
  }

  /**
   * Envoie une notification de renouvellement proche
   */
  async sendRenewalReminder(userId: string, daysUntilRenewal: number) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    await this.notificationService.createNotification(
      userId,
      NotificationType.SUBSCRIPTION_RENEWAL_REMINDER,
      "Subscription Renewal",
      `Your subscription will renew in ${daysUntilRenewal} days.`,
      {
        daysUntilRenewal,
        actionUrl: "/subscription",
      },
    );

    this.logger.log(`Renewal reminder sent to user ${userId}`);
  }

  /**
   * Envoie une notification de paiement réussi
   */
  async sendPaymentSuccessNotification(userId: string, amount: number, plan: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    await this.notificationService.createNotification(
      userId,
      NotificationType.SUBSCRIPTION_PAYMENT_SUCCESS,
      "Payment Successful",
      `Your ${plan} subscription has been activated! Amount: €${amount}`,
      {
        amount,
        plan,
        actionUrl: "/subscription",
      },
    );

    this.logger.log(`Payment success notification sent to user ${userId}`);
  }

  /**
   * Envoie une notification de paiement échoué
   */
  async sendPaymentFailedNotification(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    await this.notificationService.createNotification(
      userId,
      NotificationType.SUBSCRIPTION_PAYMENT_FAILED,
      "Payment Failed",
      "Your subscription payment failed. Please update your payment method.",
      {
        actionUrl: "/billing",
      },
    );

    this.logger.log(`Payment failed notification sent to user ${userId}`);
  }

  /**
   * Vérifie et envoie les notifications automatiques
   * À appeler via un cron job
   */
  async checkAndSendNotifications() {
    const subscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    for (const subscription of subscriptions) {
      // Vérifier les limites
      const limit = this.getActivityLimit(subscription.type);
      if (limit > 0 && limit !== -1) {
        const percentage = (subscription.activitiesUsedThisMonth / limit) * 100;

        if (percentage >= 80 && percentage < 90) {
          await this.sendLimitWarningNotification(
            subscription.userId.toString(),
            80,
          );
        } else if (percentage >= 90 && percentage < 100) {
          await this.sendLimitWarningNotification(
            subscription.userId.toString(),
            90,
          );
        } else if (percentage >= 100) {
          await this.sendLimitWarningNotification(
            subscription.userId.toString(),
            100,
          );
        }
      }

      // Vérifier le renouvellement
      if (subscription.nextBillingDate) {
        const daysUntilRenewal = Math.ceil(
          (subscription.nextBillingDate.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysUntilRenewal === 7 || daysUntilRenewal === 3 || daysUntilRenewal === 1) {
          await this.sendRenewalReminder(
            subscription.userId.toString(),
            daysUntilRenewal,
          );
        }
      }
    }
  }

  /**
   * Helper pour obtenir la limite d'activités
   */
  private getActivityLimit(type: string): number {
    switch (type) {
      case 'free':
        return 1;
      case 'premium_normal':
        return 5;
      case 'premium_gold':
      case 'premium_platinum':
        return -1;
      default:
        return 0;
    }
  }
}

