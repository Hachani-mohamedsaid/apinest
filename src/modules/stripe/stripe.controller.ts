import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionNotificationService } from '../subscription/services/subscription-notification.service';
import { SubscriptionStatus } from '../subscription/subscription.schema';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
    private subscriptionNotificationService: SubscriptionNotificationService,
    private configService: ConfigService,
  ) {}

  /**
   * POST /stripe/webhook
   * Webhook Stripe pour gérer les événements de subscription
   */
  @Post('webhook')
  async handleWebhook(
    @Body() body: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      return { received: true };
    }

    let event: Stripe.Event;

    try {
      event = this.stripeService.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return { received: true };
    }

    // Gérer les différents événements
    try {
      await this.handleStripeEvent(event);
    } catch (error) {
      this.logger.error(`Error handling webhook event: ${error.message}`, error.stack);
      throw error;
    }

    return { received: true };
  }

  private async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCancellation(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentSuccess(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleTrialEnding(subscription);
        break;
      }
    }
  }

  private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
    // Cette méthode sera implémentée dans SubscriptionService
    // Pour l'instant, on log juste
    this.logger.log(`Subscription updated: ${stripeSubscription.id}`);
  }

  private async handleSubscriptionCancellation(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Subscription cancelled: ${stripeSubscription.id}`);
  }

  private async handlePaymentSuccess(invoice: Stripe.Invoice) {
    const subscriptionId = typeof (invoice as any).subscription === 'string' 
      ? (invoice as any).subscription 
      : (invoice as any).subscription?.id;
    if (!subscriptionId) return;

    // Récupérer la subscription depuis notre DB
    const subscription = await (this.subscriptionService as any).subscriptionModel
      .findOne({ stripeSubscriptionId: subscriptionId })
      .exec();

    if (subscription) {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.nextBillingDate = new Date(invoice.period_end * 1000);
      await subscription.save();

      // Envoyer notification
      await this.subscriptionNotificationService.sendPaymentSuccessNotification(
        subscription.userId.toString(),
        subscription.monthlyPrice,
        subscription.type,
      );
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = typeof (invoice as any).subscription === 'string' 
      ? (invoice as any).subscription 
      : (invoice as any).subscription?.id;
    if (!subscriptionId) return;

    const subscription = await (this.subscriptionService as any).subscriptionModel
      .findOne({ stripeSubscriptionId: subscriptionId })
      .exec();

    if (subscription) {
      // Envoyer notification d'échec
      await this.subscriptionNotificationService.sendPaymentFailedNotification(
        subscription.userId.toString(),
      );

      // Marquer comme pending (donner quelques jours de grâce)
      subscription.status = SubscriptionStatus.PENDING;
      await subscription.save();
    }
  }

  private async handleTrialEnding(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Trial ending for subscription: ${stripeSubscription.id}`);
  }
}

