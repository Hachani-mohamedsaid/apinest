import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionNotificationService } from './services/subscription-notification.service';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './subscription.schema';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private notificationService: SubscriptionNotificationService,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  // Vérifier chaque jour à 9h du matin
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyNotifications() {
    this.logger.log('Running daily subscription notifications check...');
    await this.notificationService.checkAndSendNotifications();
  }

  // Réinitialiser les compteurs mensuels le 1er de chaque mois à minuit
  @Cron('0 0 1 * *')
  async handleMonthlyReset() {
    this.logger.log('Running monthly subscription reset...');
    
    const subscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    const now = new Date();
    let resetCount = 0;

    for (const subscription of subscriptions) {
      const lastReset = subscription.lastResetDate || subscription.startDate;
      const daysSinceReset = Math.floor(
        (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Réinitialiser si au moins 30 jours se sont écoulés
      if (daysSinceReset >= 30) {
        subscription.activitiesUsedThisMonth = 0;
        subscription.lastResetDate = now;
        await subscription.save();
        resetCount++;
      }
    }

    this.logger.log(`Monthly reset completed. ${resetCount} subscriptions reset.`);
  }
}

