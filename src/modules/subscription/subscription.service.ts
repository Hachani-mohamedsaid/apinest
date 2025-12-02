import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionType, SubscriptionStatus } from './subscription.schema';
import { SubscriptionResponseDto, SubscriptionFeaturesDto } from './dto/subscription-response.dto';
import { CheckLimitResponseDto } from './dto/check-limit.dto';
import { SubscriptionPlanDto } from './dto/subscription-plans.dto';
import { SubscriptionAnalyticsDto } from './dto/subscription-analytics.dto';
import { PaymentHistoryDto } from './dto/payment-history.dto';
import { MonthlyReportDto } from './dto/monthly-report.dto';
import { SubscriptionRecommendationsDto } from './dto/recommendations.dto';
import { AdminSubscriptionStatsDto } from './dto/admin-stats.dto';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { StripeService } from '../stripe/stripe.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
    private stripeService: StripeService,
    private usersService: UsersService,
  ) {}

  /**
   * Récupère la subscription active d'un utilisateur
   */
  async getUserSubscription(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findOne({
      userId,
      status: SubscriptionStatus.ACTIVE,
    }).exec();
  }

  /**
   * Crée automatiquement une subscription FREE pour un coach vérifié
   */
  async initializeCoachSubscription(userId: string): Promise<SubscriptionDocument> {
    const existing = await this.subscriptionModel.findOne({ userId }).exec();
    
    if (existing) {
      return existing;
    }

    const subscription = new this.subscriptionModel({
      userId,
      type: SubscriptionType.FREE,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      lastResetDate: new Date(),
      activitiesUsedThisMonth: 0,
      isCoachVerified: true,
      freeActivitiesRemaining: 1,
      monthlyPrice: 0,
      currency: 'EUR',
    });

    return subscription.save();
  }

  /**
   * Crée ou met à jour une subscription
   */
  async createOrUpdateSubscription(
    userId: string,
    type: SubscriptionType,
    paymentMethodId?: string,
    setupIntentId?: string,
  ): Promise<SubscriptionDocument> {
    // Vérifier que l'utilisateur est un coach vérifié pour les subscriptions premium
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isCoachVerified && type !== SubscriptionType.FREE) {
      throw new BadRequestException('Only verified coaches can subscribe to premium plans');
    }

    // Si setupIntentId est fourni, récupérer le paymentMethodId depuis le SetupIntent
    let finalPaymentMethodId = paymentMethodId;
    if (!finalPaymentMethodId && setupIntentId) {
      try {
        this.logger.log(`Retrieving SetupIntent: ${setupIntentId}`);
        const setupIntent = await this.stripeService.retrieveSetupIntent(setupIntentId);
        
        this.logger.log(`SetupIntent status: ${setupIntent.status}, payment_method: ${setupIntent.payment_method}`);
        
        // Vérifier que le SetupIntent est bien complété
        if (setupIntent.status !== 'succeeded') {
          throw new BadRequestException(
            `SetupIntent not completed. Status: ${setupIntent.status}. ` +
            `Please ensure the payment method was successfully collected.`
          );
        }
        
        if (setupIntent.payment_method && typeof setupIntent.payment_method === 'string') {
          finalPaymentMethodId = setupIntent.payment_method;
          this.logger.log(`Payment method ID retrieved from SetupIntent: ${finalPaymentMethodId}`);
        } else if (setupIntent.payment_method && typeof setupIntent.payment_method === 'object') {
          finalPaymentMethodId = (setupIntent.payment_method as any).id;
          this.logger.log(`Payment method ID retrieved from SetupIntent object: ${finalPaymentMethodId}`);
        }
        
        if (!finalPaymentMethodId) {
          this.logger.error(`Payment method not found in SetupIntent. SetupIntent data: ${JSON.stringify(setupIntent)}`);
          throw new BadRequestException(
            'Payment method not found in SetupIntent. ' +
            'Please ensure the payment method was successfully collected in the PaymentSheet.'
          );
        }
      } catch (error) {
        this.logger.error(`Error retrieving payment method from SetupIntent: ${error.message}`, error.stack);
        throw new BadRequestException(`Error retrieving payment method from SetupIntent: ${error.message}`);
      }
    }

    // Vérifier si l'utilisateur a déjà une subscription
    let subscription = await this.subscriptionModel.findOne({ userId }).exec();

    if (subscription) {
      // Mettre à jour la subscription existante
      subscription.type = type;
      subscription.status = SubscriptionStatus.ACTIVE;
      
      if (type !== SubscriptionType.FREE) {
        if (!finalPaymentMethodId) {
          throw new BadRequestException('Payment method ID is required for paid subscriptions');
        }

        // Créer ou mettre à jour la subscription Stripe
        const stripeSubscription = await this.stripeService.createOrUpdateSubscription(
          userId,
          type,
          finalPaymentMethodId,
          user.email,
          user.name,
        );
        
        subscription.stripeSubscriptionId = stripeSubscription.id;
        subscription.stripeCustomerId = stripeSubscription.customer as string;
        
        // Extraire la date de facturation suivante de la subscription Stripe
        const currentPeriodEnd = (stripeSubscription as any).current_period_end;
        if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
          subscription.nextBillingDate = new Date(currentPeriodEnd * 1000);
          this.logger.log(`Next billing date set from Stripe: ${subscription.nextBillingDate.toISOString()}`);
        } else {
          // Fallback: calculer 30 jours à partir de maintenant
          const fallbackDate = new Date();
          fallbackDate.setDate(fallbackDate.getDate() + 30);
          subscription.nextBillingDate = fallbackDate;
          this.logger.warn(`current_period_end not found in Stripe subscription, using fallback: ${fallbackDate.toISOString()}`);
        }
        
        subscription.monthlyPrice = this.getMonthlyPrice(type);
        subscription.currency = 'EUR';
      } else {
        // Retour à FREE
        subscription.freeActivitiesRemaining = 1;
        subscription.monthlyPrice = 0;
        if (subscription.stripeSubscriptionId) {
          await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
        }
      }
      
      return subscription.save();
    }

    // Créer une nouvelle subscription
    subscription = new this.subscriptionModel({
      userId,
      type,
      status: type === SubscriptionType.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PENDING,
      startDate: new Date(),
      lastResetDate: new Date(),
      activitiesUsedThisMonth: 0,
      isCoachVerified: user.isCoachVerified || false,
      monthlyPrice: type === SubscriptionType.FREE ? 0 : this.getMonthlyPrice(type),
      currency: 'EUR',
    });

    // Si c'est un coach vérifié avec subscription FREE
    if (type === SubscriptionType.FREE) {
      subscription.freeActivitiesRemaining = 1;
    }

    // Si c'est une subscription payante, créer la subscription Stripe
    if (type !== SubscriptionType.FREE) {
      if (!finalPaymentMethodId) {
        throw new BadRequestException('Payment method ID is required for paid subscriptions');
      }

      const stripeSubscription = await this.stripeService.createOrUpdateSubscription(
        userId,
        type,
        finalPaymentMethodId,
        user.email,
        user.name,
      );
      
      subscription.stripeSubscriptionId = stripeSubscription.id;
      subscription.stripeCustomerId = stripeSubscription.customer as string;
      
      // Extraire la date de facturation suivante de la subscription Stripe
      const currentPeriodEnd = (stripeSubscription as any).current_period_end;
      if (currentPeriodEnd && typeof currentPeriodEnd === 'number') {
        subscription.nextBillingDate = new Date(currentPeriodEnd * 1000);
        this.logger.log(`Next billing date set from Stripe: ${subscription.nextBillingDate.toISOString()}`);
      } else {
        // Fallback: calculer 30 jours à partir de maintenant
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + 30);
        subscription.nextBillingDate = fallbackDate;
        this.logger.warn(`current_period_end not found in Stripe subscription, using fallback: ${fallbackDate.toISOString()}`);
      }
      
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    return subscription.save();
  }

  /**
   * Vérifie si l'utilisateur peut créer une activité
   */
  async checkActivityLimit(userId: string): Promise<CheckLimitResponseDto> {
    let subscription = await this.getUserSubscription(userId);
    
    // Si pas de subscription, vérifier si c'est un coach vérifié et initialiser
    if (!subscription) {
      const user = await this.usersService.findById(userId);
      if (user?.isCoachVerified) {
        subscription = await this.initializeCoachSubscription(userId);
      } else {
        return {
          canCreate: false,
          activitiesUsed: 0,
          activitiesLimit: 0,
          activitiesRemaining: 0,
          subscriptionType: 'none',
          freeActivitiesRemaining: 0,
          message: 'Aucune subscription active. Veuillez souscrire à un plan premium.',
        };
      }
    }

    // Réinitialiser le compteur mensuel si nécessaire
    await this.resetMonthlyCounterIfNeeded(subscription);

    const limit = this.getActivityLimit(subscription.type);
    const used = subscription.activitiesUsedThisMonth;

    // Vérifier les activités gratuites pour les coaches vérifiés
    if (subscription.isCoachVerified && subscription.freeActivitiesRemaining > 0) {
      return {
        canCreate: true,
        activitiesUsed: used,
        activitiesLimit: limit,
        activitiesRemaining: limit === -1 ? -1 : Math.max(0, limit - used),
        subscriptionType: subscription.type,
        freeActivitiesRemaining: subscription.freeActivitiesRemaining,
        message: `Activité gratuite disponible (${subscription.freeActivitiesRemaining} restante(s))`,
      };
    }

    // Vérifier la limite mensuelle
    if (limit === -1) {
      // Illimité
      return {
        canCreate: true,
        activitiesUsed: used,
        activitiesLimit: -1,
        activitiesRemaining: -1,
        subscriptionType: subscription.type,
        freeActivitiesRemaining: 0,
      };
    }

    if (used >= limit) {
      return {
        canCreate: false,
        activitiesUsed: used,
        activitiesLimit: limit,
        activitiesRemaining: 0,
        subscriptionType: subscription.type,
        freeActivitiesRemaining: 0,
        message: `Limite mensuelle atteinte (${limit}/${limit} activités). Passez à Premium Gold pour un accès illimité.`,
      };
    }

    return {
      canCreate: true,
      activitiesUsed: used,
      activitiesLimit: limit,
      activitiesRemaining: Math.max(0, limit - used),
      subscriptionType: subscription.type,
      freeActivitiesRemaining: subscription.freeActivitiesRemaining,
    };
  }

  /**
   * Incrémente le compteur d'activités après création
   */
  async incrementActivityCount(userId: string): Promise<void> {
    let subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      // Si pas de subscription, créer une FREE pour coach vérifié
      const user = await this.usersService.findById(userId);
      if (user?.isCoachVerified) {
        subscription = await this.initializeCoachSubscription(userId);
      } else {
        throw new BadRequestException('Aucune subscription active');
      }
    }

    // Réinitialiser le compteur mensuel si nécessaire
    await this.resetMonthlyCounterIfNeeded(subscription);

    // Utiliser d'abord les activités gratuites pour les coaches vérifiés
    if (subscription.isCoachVerified && subscription.freeActivitiesRemaining > 0) {
      subscription.freeActivitiesRemaining -= 1;
      this.logger.log(`Coach ${userId} used free activity. Remaining: ${subscription.freeActivitiesRemaining}`);
    } else {
      subscription.activitiesUsedThisMonth += 1;
      this.logger.log(`Coach ${userId} used monthly activity. Used: ${subscription.activitiesUsedThisMonth}`);
    }

    await subscription.save();
  }

  /**
   * Réinitialise le compteur mensuel si nécessaire
   */
  private async resetMonthlyCounterIfNeeded(subscription: SubscriptionDocument): Promise<void> {
    const now = new Date();
    const lastReset = subscription.lastResetDate || subscription.startDate;
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReset >= 30) {
      subscription.activitiesUsedThisMonth = 0;
      subscription.lastResetDate = now;
      await subscription.save();
      this.logger.log(`Monthly counter reset for subscription ${subscription._id}`);
    }
  }

  /**
   * Retourne la limite d'activités selon le type de subscription
   */
  private getActivityLimit(type: SubscriptionType): number {
    switch (type) {
      case SubscriptionType.FREE:
        return 1; // 1 activité gratuite pour coach vérifié
      case SubscriptionType.PREMIUM_NORMAL:
        return 5; // 5 activités par mois
      case SubscriptionType.PREMIUM_GOLD:
      case SubscriptionType.PREMIUM_PLATINUM:
        return -1; // Illimité
      default:
        return 0;
    }
  }

  /**
   * Retourne le prix mensuel selon le type de subscription
   */
  private getMonthlyPrice(type: SubscriptionType): number {
    switch (type) {
      case SubscriptionType.FREE:
        return 0;
      case SubscriptionType.PREMIUM_NORMAL:
        return 9.99; // 9.99 EUR/mois
      case SubscriptionType.PREMIUM_GOLD:
        return 19.99; // 19.99 EUR/mois
      case SubscriptionType.PREMIUM_PLATINUM:
        return 29.99; // 29.99 EUR/mois
      default:
        return 0;
    }
  }

  /**
   * Récupère les features selon le type de subscription
   */
  getSubscriptionFeatures(type: SubscriptionType): SubscriptionFeaturesDto {
    switch (type) {
      case SubscriptionType.FREE:
        return {
          maxActivitiesPerMonth: 1,
          unlimitedActivities: false,
          prioritySupport: false,
          advancedAnalytics: false,
          customBranding: false,
          apiAccess: false,
          featuredListing: false,
        };
      case SubscriptionType.PREMIUM_NORMAL:
        return {
          maxActivitiesPerMonth: 5,
          unlimitedActivities: false,
          prioritySupport: false,
          advancedAnalytics: true,
          customBranding: false,
          apiAccess: false,
          featuredListing: false,
        };
      case SubscriptionType.PREMIUM_GOLD:
        return {
          maxActivitiesPerMonth: -1,
          unlimitedActivities: true,
          prioritySupport: true,
          advancedAnalytics: true,
          customBranding: true,
          apiAccess: false,
          featuredListing: true,
        };
      case SubscriptionType.PREMIUM_PLATINUM:
        return {
          maxActivitiesPerMonth: -1,
          unlimitedActivities: true,
          prioritySupport: true,
          advancedAnalytics: true,
          customBranding: true,
          apiAccess: true,
          featuredListing: true,
        };
      default:
        return {
          maxActivitiesPerMonth: 0,
          unlimitedActivities: false,
          prioritySupport: false,
          advancedAnalytics: false,
          customBranding: false,
          apiAccess: false,
          featuredListing: false,
        };
    }
  }

  /**
   * Récupère tous les plans disponibles
   */
  async getAvailablePlans(): Promise<SubscriptionPlanDto[]> {
    return [
      {
        id: 'free',
        name: 'Free',
        type: SubscriptionType.FREE,
        price: 0,
        currency: 'EUR',
        interval: 'month',
        activitiesLimit: 1,
        features: this.getSubscriptionFeatures(SubscriptionType.FREE),
        stripePriceId: '',
      },
      {
        id: 'premium-normal',
        name: 'Premium Normal',
        type: SubscriptionType.PREMIUM_NORMAL,
        price: 9.99,
        currency: 'EUR',
        interval: 'month',
        activitiesLimit: 5,
        features: this.getSubscriptionFeatures(SubscriptionType.PREMIUM_NORMAL),
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_PREMIUM_NORMAL || '',
      },
      {
        id: 'premium-gold',
        name: 'Premium Gold',
        type: SubscriptionType.PREMIUM_GOLD,
        price: 19.99,
        currency: 'EUR',
        interval: 'month',
        activitiesLimit: -1,
        features: this.getSubscriptionFeatures(SubscriptionType.PREMIUM_GOLD),
        popular: true,
        stripePriceId: process.env.STRIPE_PRICE_PREMIUM_GOLD || '',
      },
      {
        id: 'premium-platinum',
        name: 'Premium Platinum',
        type: SubscriptionType.PREMIUM_PLATINUM,
        price: 29.99,
        currency: 'EUR',
        interval: 'month',
        activitiesLimit: -1,
        features: this.getSubscriptionFeatures(SubscriptionType.PREMIUM_PLATINUM),
        popular: false,
        stripePriceId: process.env.STRIPE_PRICE_PREMIUM_PLATINUM || '',
      },
    ];
  }

  /**
   * Convertit la subscription en DTO de réponse
   */
  async getSubscriptionResponse(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new NotFoundException('Aucune subscription active');
    }

    const limit = this.getActivityLimit(subscription.type);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - subscription.activitiesUsedThisMonth);

    return {
      id: subscription._id.toString(),
      userId: subscription.userId.toString(),
      type: subscription.type,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      activitiesUsedThisMonth: subscription.activitiesUsedThisMonth,
      activitiesLimit: limit,
      activitiesRemaining: remaining,
      freeActivitiesRemaining: subscription.freeActivitiesRemaining,
      isCoachVerified: subscription.isCoachVerified,
      monthlyPrice: subscription.monthlyPrice,
      currency: subscription.currency,
      features: this.getSubscriptionFeatures(subscription.type),
    };
  }

  /**
   * Annule une subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      throw new NotFoundException('Aucune subscription active');
    }

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.endDate = new Date();
    await subscription.save();
  }

  /**
   * Récupère les statistiques détaillées pour un coach premium
   */
  async getSubscriptionAnalytics(userId: string): Promise<SubscriptionAnalyticsDto> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription');
    }

    // Récupérer toutes les activités du coach
    const activities = await this.activityModel.find({
      creator: new Types.ObjectId(userId),
      date: { $gte: subscription.startDate }
    }).exec();

    // Calculer les statistiques
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const activitiesThisMonth = activities.filter(a => {
      const created = (a as any).createdAt ? new Date((a as any).createdAt) : new Date(a.date);
      return created >= startOfMonth;
    });
    const activitiesLastMonth = activities.filter(a => {
      const created = (a as any).createdAt ? new Date((a as any).createdAt) : new Date(a.date);
      return created >= startOfLastMonth && created <= endOfLastMonth;
    });

    // Calculer les revenus (si prix défini)
    const revenueGenerated = activities.reduce((sum, activity) => {
      const price = activity.price || 0;
      const participants = activity.participantIds?.length || 0;
      return sum + (price * participants);
    }, 0);

    // Calculer le taux de remplissage
    const totalSpots = activities.reduce((sum, a) => sum + (a.participants || 0), 0);
    const totalParticipants = activities.reduce((sum, a) => 
      sum + (a.participantIds?.length || 0), 0);
    const fillRate = totalSpots > 0 ? (totalParticipants / totalSpots) * 100 : 0;

    // Données pour les graphiques (6 derniers mois)
    const chartData = this.generateChartData(activities, subscription.startDate);

    // Top activités
    const topActivities = activities
      .map(a => ({
        activityId: a._id.toString(),
        title: a.title,
        participants: a.participantIds?.length || 0,
        revenue: (a.price || 0) * (a.participantIds?.length || 0),
        date: (a as any).createdAt ? new Date((a as any).createdAt) : new Date(a.date)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalActivitiesCreated: activities.length,
      activitiesThisMonth: activitiesThisMonth.length,
      activitiesLastMonth: activitiesLastMonth.length,
      averageActivitiesPerMonth: this.calculateAveragePerMonth(
        activities.length,
        subscription.startDate
      ),
      totalParticipants,
      averageParticipantsPerActivity: activities.length > 0 
        ? totalParticipants / activities.length 
        : 0,
      revenueGenerated,
      averageRevenuePerActivity: activities.length > 0 
        ? revenueGenerated / activities.length 
        : 0,
      fillRate: Math.round(fillRate * 100) / 100,
      currentPlan: subscription.type,
      planStartDate: subscription.startDate,
      daysUntilRenewal: subscription.nextBillingDate 
        ? Math.ceil((subscription.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      chartData,
      topActivities
    };
  }

  /**
   * Génère les données pour les graphiques
   */
  private generateChartData(activities: ActivityDocument[], startDate: Date) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activitiesByMonth: { [key: string]: number } = {};
    const revenueByMonth: { [key: string]: number } = {};
    const participantsByMonth: { [key: string]: number } = {};

    activities
      .filter(a => {
        const created = (a as any).createdAt ? new Date((a as any).createdAt) : new Date(a.date);
        return created >= sixMonthsAgo;
      })
      .forEach(activity => {
        const created = (activity as any).createdAt ? new Date((activity as any).createdAt) : new Date(activity.date);
        const month = created.toISOString().substring(0, 7); // YYYY-MM
        activitiesByMonth[month] = (activitiesByMonth[month] || 0) + 1;
        revenueByMonth[month] = (revenueByMonth[month] || 0) + 
          ((activity.price || 0) * (activity.participantIds?.length || 0));
        participantsByMonth[month] = (participantsByMonth[month] || 0) + 
          (activity.participantIds?.length || 0);
      });

    return {
      activitiesByMonth: Object.entries(activitiesByMonth).map(([month, count]) => ({
        month,
        count
      })),
      revenueByMonth: Object.entries(revenueByMonth).map(([month, amount]) => ({
        month,
        amount
      })),
      participantsByMonth: Object.entries(participantsByMonth).map(([month, count]) => ({
        month,
        count
      }))
    };
  }

  /**
   * Calcule la moyenne d'activités par mois
   */
  private calculateAveragePerMonth(total: number, startDate: Date): number {
    const months = Math.max(1, Math.ceil(
      (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return Math.round((total / months) * 100) / 100;
  }

  /**
   * Récupère l'historique des paiements
   */
  async getPaymentHistory(userId: string): Promise<PaymentHistoryDto> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.stripeCustomerId) {
      return {
        payments: [],
        totalPaid: 0
      };
    }

    // Récupérer les invoices depuis Stripe
    const invoices = await this.stripeService.getCustomerInvoices(
      subscription.stripeCustomerId
    );

    const payments = invoices.map(invoice => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      amount: invoice.amount_paid / 100, // Convertir de centimes
      currency: invoice.currency.toUpperCase(),
      plan: subscription.type,
      status: this.mapStripeStatus(invoice.status),
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      stripeInvoiceId: invoice.id
    }));

    const totalPaid = payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      payments,
      totalPaid,
      nextPaymentDate: subscription.nextBillingDate,
      nextPaymentAmount: subscription.monthlyPrice
    };
  }

  /**
   * Map le statut Stripe vers notre format
   */
  private mapStripeStatus(status: string): 'success' | 'failed' | 'pending' | 'refunded' {
    switch (status) {
      case 'paid': return 'success';
      case 'open': return 'pending';
      case 'void': return 'failed';
      case 'uncollectible': return 'failed';
      default: return 'pending';
    }
  }

  /**
   * Génère un rapport mensuel
   */
  async getMonthlyReport(
    userId: string,
    month: number,
    year: number
  ): Promise<MonthlyReportDto> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const activities = await this.activityModel.find({
      creator: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate }
    }).exec();

    // Calculer les statistiques
    const totalParticipants = activities.reduce((sum, a) => 
      sum + (a.participantIds?.length || 0), 0);
    const totalRevenue = activities.reduce((sum, a) => 
      sum + ((a.price || 0) * (a.participantIds?.length || 0)), 0);

    // Générer les insights
    const insights = this.generateInsights(activities, subscription);
    const recommendations = this.generateRecommendations(activities, subscription);

    return {
      month: startDate.toLocaleString('default', { month: 'long' }),
      year,
      summary: {
        activitiesCreated: activities.length,
        totalParticipants,
        totalRevenue,
        averageRating: 0, // À calculer si vous avez des reviews
        fillRate: this.calculateFillRate(activities)
      },
      activities: activities.map(a => ({
        id: a._id.toString(),
        title: a.title,
        date: (a as any).createdAt ? new Date((a as any).createdAt) : new Date(a.date),
        participants: a.participantIds?.length || 0,
        revenue: (a.price || 0) * (a.participantIds?.length || 0)
      })),
      chartData: this.generateWeeklyChartData(activities, startDate, endDate),
      insights,
      recommendations
    };
  }

  /**
   * Génère les insights pour le rapport mensuel
   */
  private generateInsights(activities: ActivityDocument[], subscription: SubscriptionDocument): string[] {
    const insights: string[] = [];

    if (activities.length === 0) {
      insights.push("No activities created this month. Start creating activities to grow your coaching business!");
      return insights;
    }

    const avgParticipants = activities.reduce((sum, a) => 
      sum + (a.participantIds?.length || 0), 0) / activities.length;

    if (avgParticipants > 10) {
      insights.push(`Great! Your activities average ${avgParticipants.toFixed(1)} participants.`);
    }

    const fillRate = this.calculateFillRate(activities);
    if (fillRate > 80) {
      insights.push(`Excellent fill rate of ${fillRate.toFixed(0)}%!`);
    } else if (fillRate < 50) {
      insights.push(`Fill rate is ${fillRate.toFixed(0)}%. Consider adjusting your pricing or promotion.`);
    }

    // Vérifier la limite
    const limit = this.getActivityLimit(subscription.type);
    if (limit > 0 && activities.length >= limit) {
      insights.push(`You've reached your monthly limit of ${limit} activities. Upgrade to Premium Gold for unlimited activities!`);
    }

    return insights;
  }

  /**
   * Génère les recommandations pour le rapport mensuel
   */
  private generateRecommendations(activities: ActivityDocument[], subscription: SubscriptionDocument): string[] {
    const recommendations: string[] = [];

    if (activities.length === 0) {
      recommendations.push("Create your first activity to start building your coaching presence!");
      return recommendations;
    }

    // Recommandations basées sur les données
    const revenue = activities.reduce((sum, a) => 
      sum + ((a.price || 0) * (a.participantIds?.length || 0)), 0);

    if (revenue > 500 && subscription.type === SubscriptionType.PREMIUM_NORMAL) {
      recommendations.push("You're generating good revenue! Consider upgrading to Premium Gold for unlimited activities and higher earnings.");
    }

    const limit = this.getActivityLimit(subscription.type);
    if (limit > 0 && activities.length >= limit * 0.8) {
      recommendations.push("You're approaching your activity limit. Upgrade now to avoid interruption!");
    }

    return recommendations;
  }

  /**
   * Calcule le taux de remplissage
   */
  private calculateFillRate(activities: ActivityDocument[]): number {
    const totalSpots = activities.reduce((sum, a) => sum + (a.participants || 0), 0);
    const totalParticipants = activities.reduce((sum, a) => 
      sum + (a.participantIds?.length || 0), 0);
    return totalSpots > 0 ? (totalParticipants / totalSpots) * 100 : 0;
  }

  /**
   * Génère les données hebdomadaires pour les graphiques
   */
  private generateWeeklyChartData(activities: ActivityDocument[], startDate: Date, endDate: Date) {
    const activitiesByWeek: { [key: string]: number } = {};
    const revenueByWeek: { [key: string]: number } = {};

    activities.forEach(activity => {
      const activityDate = (activity as any).createdAt ? new Date((activity as any).createdAt) : new Date(activity.date);
      const weekStart = new Date(activityDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Début de la semaine (dimanche)
      const weekKey = weekStart.toISOString().substring(0, 10); // YYYY-MM-DD

      activitiesByWeek[weekKey] = (activitiesByWeek[weekKey] || 0) + 1;
      revenueByWeek[weekKey] = (revenueByWeek[weekKey] || 0) + 
        ((activity.price || 0) * (activity.participantIds?.length || 0));
    });

    return {
      activitiesByWeek: Object.entries(activitiesByWeek).map(([week, count]) => ({
        week,
        count
      })),
      revenueByWeek: Object.entries(revenueByWeek).map(([week, amount]) => ({
        week,
        amount
      }))
    };
  }

  /**
   * Génère des recommandations personnalisées
   */
  async getRecommendations(userId: string): Promise<SubscriptionRecommendationsDto> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription');
    }

    const activities = await this.activityModel.find({
      creator: new Types.ObjectId(userId),
      date: { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
      }
    }).exec();

    const limit = this.getActivityLimit(subscription.type);
    const used = subscription.activitiesUsedThisMonth;
    const percentage = limit > 0 && limit !== -1 ? (used / limit) * 100 : 0;

    // Générer la recommandation
    let recommendedPlan: string | undefined;
    let reason = '';
    let upgradeBenefits: string[] = [];

    if (subscription.type === SubscriptionType.FREE && used >= 1) {
      recommendedPlan = 'premium_normal';
      reason = 'You\'ve used your free activity. Upgrade to create 5 activities per month!';
      upgradeBenefits = [
        '5 activities per month',
        'Advanced analytics',
        'Priority support'
      ];
    } else if (subscription.type === SubscriptionType.PREMIUM_NORMAL && percentage >= 80) {
      recommendedPlan = 'premium_gold';
      reason = `You've used ${used}/${limit} activities this month. Upgrade for unlimited activities!`;
      upgradeBenefits = [
        'Unlimited activities',
        'Priority support',
        'Custom branding',
        'Featured listing'
      ];
    } else if (subscription.type === SubscriptionType.PREMIUM_GOLD || subscription.type === SubscriptionType.PREMIUM_PLATINUM) {
      reason = 'You\'re on the best plan! Keep creating amazing activities.';
    }

    // Market insights (si vous avez des données de marché)
    const marketInsights = await this.generateMarketInsights(userId, activities);

    return {
      recommendedPlan,
      reason,
      upgradeBenefits,
      currentUsage: {
        activitiesUsed: used,
        activitiesLimit: limit,
        percentage: Math.round(percentage)
      },
      marketInsights
    };
  }

  /**
   * Génère les insights de marché
   */
  private async generateMarketInsights(userId: string, activities: ActivityDocument[]) {
    // Récupérer les prix moyens du marché (exemple)
    const allActivities = await this.activityModel.find({
      price: { $exists: true, $gt: 0 }
    }).limit(100).exec();

    if (allActivities.length === 0) return undefined;

    const averagePrice = allActivities.reduce((sum, a) => sum + (a.price || 0), 0) / allActivities.length;
    const userAveragePrice = activities.length > 0
      ? activities.reduce((sum, a) => sum + (a.price || 0), 0) / activities.length
      : 0;

    let recommendation: 'increase' | 'decrease' | 'ok' = 'ok';
    if (userAveragePrice < averagePrice * 0.8) {
      recommendation = 'increase';
    } else if (userAveragePrice > averagePrice * 1.2) {
      recommendation = 'decrease';
    }

    return {
      averagePrice: Math.round(averagePrice * 100) / 100,
      yourAveragePrice: Math.round(userAveragePrice * 100) / 100,
      recommendation
    };
  }

  /**
   * Met à jour la méthode de paiement
   */
  async updatePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.stripeCustomerId) {
      throw new NotFoundException('No active subscription with payment method');
    }

    await this.stripeService.updatePaymentMethod(
      subscription.stripeCustomerId,
      paymentMethodId,
      subscription.stripeSubscriptionId
    );

    subscription.stripePaymentMethodId = paymentMethodId;
    await subscription.save();
  }

  /**
   * Récupère les statistiques admin
   */
  async getAdminStats(): Promise<AdminSubscriptionStatsDto> {
    const subscriptions = await this.subscriptionModel.find().exec();

    const activeSubscriptions = subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE);
    const cancelledSubscriptions = subscriptions.filter(s => s.status === SubscriptionStatus.CANCELLED);

    const subscriptionsByType = {
      free: subscriptions.filter(s => s.type === SubscriptionType.FREE).length,
      premium_normal: subscriptions.filter(s => s.type === SubscriptionType.PREMIUM_NORMAL).length,
      premium_gold: subscriptions.filter(s => s.type === SubscriptionType.PREMIUM_GOLD).length,
      premium_platinum: subscriptions.filter(s => s.type === SubscriptionType.PREMIUM_PLATINUM).length
    };

    const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s) => 
      sum + (s.monthlyPrice || 0), 0);

    return {
      totalSubscriptions: subscriptions.length,
      subscriptionsByType,
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser: activeSubscriptions.length > 0
        ? monthlyRecurringRevenue / activeSubscriptions.length
        : 0,
      churnRate: subscriptions.length > 0
        ? (cancelledSubscriptions.length / subscriptions.length) * 100
        : 0,
      activeSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length
    };
  }
}

