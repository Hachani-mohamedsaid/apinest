import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CheckLimitResponseDto } from './dto/check-limit.dto';
import { SubscriptionPlansResponseDto } from './dto/subscription-plans.dto';
import { SubscriptionAnalyticsDto } from './dto/subscription-analytics.dto';
import { PaymentHistoryDto } from './dto/payment-history.dto';
import { MonthlyReportDto } from './dto/monthly-report.dto';
import { SubscriptionRecommendationsDto } from './dto/recommendations.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { ApplyPromoCodeDto } from './dto/apply-promo-code.dto';
import { AdminSubscriptionStatsDto } from './dto/admin-stats.dto';
import { NotificationService } from '../achievements/services/notification.service';
import { NotificationType } from '../achievements/schemas/notification.schema';
import { StripeService } from '../stripe/stripe.service';
import { UsersService } from '../users/users.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { InitializePaymentResponseDto } from './dto/initialize-payment-response.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService,
    private stripeService: StripeService,
    private usersService: UsersService,
  ) {}

  /**
   * GET /subscriptions/me
   * Récupère la subscription active de l'utilisateur
   */
  @Get('me')
  async getMySubscription(@Request() req): Promise<SubscriptionResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    return this.subscriptionService.getSubscriptionResponse(userId);
  }

  /**
   * GET /subscriptions/check-limit
   * Vérifie si l'utilisateur peut créer une activité
   */
  @Get('check-limit')
  async checkLimit(@Request() req): Promise<CheckLimitResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    return this.subscriptionService.checkActivityLimit(userId);
  }

  /**
   * GET /subscriptions/plans
   * Récupère tous les plans disponibles
   */
  @Get('plans')
  async getPlans(@Request() req): Promise<SubscriptionPlansResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    const plans = await this.subscriptionService.getAvailablePlans();
    let currentPlan: SubscriptionResponseDto | undefined;
    
    try {
      currentPlan = await this.subscriptionService.getSubscriptionResponse(userId);
    } catch (error) {
      // Pas de subscription active, c'est normal
    }

    return {
      plans,
      currentPlan,
    };
  }

  /**
   * POST /subscriptions/initialize-payment
   * Crée un SetupIntent Stripe pour collecter la méthode de paiement
   */
  @Post('initialize-payment')
  async initializePayment(
    @Request() req,
    @Body() body: InitializePaymentDto,
  ): Promise<InitializePaymentResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    const { planType } = body;

    // Vérifier que l'utilisateur est un coach vérifié
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (planType !== 'free' && !user.isCoachVerified) {
      throw new BadRequestException('Only verified coaches can subscribe to premium plans');
    }

    // Créer le SetupIntent
    const setupIntent = await this.stripeService.createSetupIntent(
      userId,
      user.email,
      user.name || user.email,
      planType,
    );

    return {
      clientSecret: setupIntent.client_secret!,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * POST /subscriptions
   * Crée ou met à jour une subscription
   */
  @Post()
  async createSubscription(
    @Request() req,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    
    try {
      // Pour les plans payants, vérifier qu'on a soit paymentMethodId soit setupIntentId
      if (createSubscriptionDto.type !== 'free') {
        if (!createSubscriptionDto.paymentMethodId && !createSubscriptionDto.setupIntentId) {
          throw new BadRequestException('Payment method ID or SetupIntent ID is required for paid subscriptions');
        }
      }

      console.log(`[SubscriptionController] Creating subscription for user ${userId}, type: ${createSubscriptionDto.type}, setupIntentId: ${createSubscriptionDto.setupIntentId}, paymentMethodId: ${createSubscriptionDto.paymentMethodId}`);

      await this.subscriptionService.createOrUpdateSubscription(
        userId,
        createSubscriptionDto.type,
        createSubscriptionDto.paymentMethodId,
        createSubscriptionDto.setupIntentId,
      );

      console.log(`[SubscriptionController] Subscription created successfully for user ${userId}`);

      return this.subscriptionService.getSubscriptionResponse(userId);
    } catch (error) {
      console.error(`[SubscriptionController] Error creating subscription for user ${userId}:`, error);
      console.error(`[SubscriptionController] Error details:`, {
        message: error.message,
        stack: error.stack,
        type: createSubscriptionDto.type,
        setupIntentId: createSubscriptionDto.setupIntentId,
        paymentMethodId: createSubscriptionDto.paymentMethodId,
      });
      throw error;
    }
  }

  /**
   * DELETE /subscriptions
   * Annule la subscription de l'utilisateur
   */
  @Delete()
  async cancelSubscription(@Request() req): Promise<{ message: string }> {
    const userId = req.user._id?.toString() || req.user.sub;
    await this.subscriptionService.cancelSubscription(userId);
    return { message: 'Subscription cancelled successfully' };
  }

  /**
   * GET /subscriptions/analytics
   * Récupère les statistiques détaillées pour un coach premium
   */
  @Get('analytics')
  async getAnalytics(@Request() req): Promise<SubscriptionAnalyticsDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    return this.subscriptionService.getSubscriptionAnalytics(userId);
  }

  /**
   * GET /subscriptions/payment-history
   * Récupère l'historique complet des paiements
   */
  @Get('payment-history')
  async getPaymentHistory(@Request() req): Promise<PaymentHistoryDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    return this.subscriptionService.getPaymentHistory(userId);
  }

  /**
   * GET /subscriptions/reports/monthly
   * Génère un rapport mensuel détaillé
   */
  @Get('reports/monthly')
  async getMonthlyReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Request() req
  ): Promise<MonthlyReportDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.subscriptionService.getMonthlyReport(userId, monthNum, yearNum);
  }

  /**
   * GET /subscriptions/recommendations
   * Génère des recommandations personnalisées pour le coach
   */
  @Get('recommendations')
  async getRecommendations(@Request() req): Promise<SubscriptionRecommendationsDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    return this.subscriptionService.getRecommendations(userId);
  }

  /**
   * PUT /subscriptions/payment-method
   * Permet de mettre à jour la méthode de paiement
   */
  @Put('payment-method')
  async updatePaymentMethod(
    @Request() req,
    @Body() dto: UpdatePaymentMethodDto
  ): Promise<{ message: string }> {
    const userId = req.user._id?.toString() || req.user.sub;
    await this.subscriptionService.updatePaymentMethod(userId, dto.paymentMethodId);
    return { message: 'Payment method updated successfully' };
  }

  /**
   * GET /subscriptions/stats
   * Statistiques globales pour les admins
   * TODO: Ajouter AdminGuard
   */
  @Get('stats')
  async getAdminStats(@Request() req): Promise<AdminSubscriptionStatsDto> {
    // TODO: Vérifier que l'utilisateur est admin
    return this.subscriptionService.getAdminStats();
  }

  /**
   * GET /subscriptions/notifications
   * Récupère les notifications de subscription pour l'utilisateur
   */
  @Get('notifications')
  async getNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user._id?.toString() || req.user.sub;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const unreadOnlyBool = unreadOnly === 'true';

    // Types de notifications de subscription
    const subscriptionTypes = [
      NotificationType.SUBSCRIPTION_LIMIT_WARNING,
      NotificationType.SUBSCRIPTION_RENEWAL_REMINDER,
      NotificationType.SUBSCRIPTION_PAYMENT_SUCCESS,
      NotificationType.SUBSCRIPTION_PAYMENT_FAILED,
    ];

    const result = await this.notificationService.getUserNotifications(
      userId,
      1,
      limitNum,
      unreadOnlyBool,
      subscriptionTypes,
    );

    return result.notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      actionUrl: n.metadata?.actionUrl,
      metadata: n.metadata,
      createdAt: ((n as any).createdAt || new Date()).toISOString(),
    }));
  }

  /**
   * PATCH /subscriptions/notifications/:id/read
   * Marque une notification comme lue
   */
  @Patch('notifications/:id/read')
  async markNotificationAsRead(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    const userId = req.user._id?.toString() || req.user.sub;
    await this.notificationService.markAsRead(userId, id);
    return { message: 'Notification marked as read' };
  }
}

