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

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService,
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
   * POST /subscriptions
   * Crée ou met à jour une subscription
   */
  @Post()
  async createSubscription(
    @Request() req,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.user._id?.toString() || req.user.sub;
    if (createSubscriptionDto.type !== 'free' && !createSubscriptionDto.paymentMethodId) {
      throw new BadRequestException('Payment method ID is required for paid subscriptions');
    }

    await this.subscriptionService.createOrUpdateSubscription(
      userId,
      createSubscriptionDto.type,
      createSubscriptionDto.paymentMethodId,
    );

    return this.subscriptionService.getSubscriptionResponse(userId);
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

