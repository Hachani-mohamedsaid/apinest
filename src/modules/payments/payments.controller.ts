import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateWithdrawDto, WithdrawResponseDto } from './dto/withdraw.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment intent for an activity' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or activity is free' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.paymentsService.createPaymentIntent(createPaymentIntentDto, userId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment and add user as participant' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
  })
  @ApiResponse({ status: 400, description: 'Payment not confirmed or activity is full' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.paymentsService.confirmPayment(confirmPaymentDto, userId);
  }

  @Get('check-payment/:activityId')
  @ApiOperation({ summary: 'Check payment status for an activity' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkPayment(@Param('activityId') activityId: string, @Request() req) {
    const userId = req.user.sub;
    return this.paymentsService.checkPayment(activityId, userId);
  }

  /**
   * GET /payments/coach/earnings
   * Récupère les earnings (revenus) du coach pour une période donnée
   */
  @Get('coach/earnings')
  @ApiOperation({
    summary: 'Get coach earnings',
    description: 'Retrieves earnings (revenue) for the authenticated coach for a given period',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year (e.g., 2025)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Month (1-12)',
  })
  @ApiResponse({
    status: 200,
    description: 'Coach earnings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCoachEarnings(
    @Request() req,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    const coachId = req.user.sub;
    
    // Utiliser la méthode du service qui gère déjà tout
    return this.paymentsService.getCoachEarnings(coachId, year, month);
  }

  /**
   * POST /payments/coach/withdraw
   * Demander un retrait des gains
   */
  @Post('coach/withdraw')
  @ApiOperation({
    summary: 'Request withdrawal of earnings',
    description: 'Allows coaches to request withdrawal of their accumulated earnings',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request submitted successfully',
    type: WithdrawResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestWithdraw(
    @Request() req,
    @Body() createWithdrawDto: CreateWithdrawDto
  ): Promise<WithdrawResponseDto> {
    const coachId = req.user.sub || req.user._id?.toString();
    
    console.log(`[DEBUG] Withdraw request from coach ${coachId}`);
    console.log(`[DEBUG] Request body:`, JSON.stringify(createWithdrawDto));

    try {
      const result = await this.paymentsService.createWithdraw(
        createWithdrawDto,
        coachId
      );

      return result;
    } catch (error) {
      console.error(`[ERROR] Withdraw request failed:`, error);
      
      // Si c'est déjà une exception HTTP, la relancer
      if (error.status) {
        throw error;
      }

      // Sinon, créer une exception générique
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to process withdrawal request',
        error: error.message || 'Unknown error'
      });
    }
  }

  /**
   * GET /payments/coach/withdraw/balance
   * Récupérer le solde disponible
   */
  @Get('coach/withdraw/balance')
  @ApiOperation({
    summary: 'Get available balance for withdrawal',
    description: 'Returns the available balance that can be withdrawn by the coach',
  })
  @ApiResponse({
    status: 200,
    description: 'Available balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        availableBalance: { type: 'number', example: 350.0 },
        currency: { type: 'string', example: 'usd' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableBalance(@Request() req) {
    const coachId = req.user.sub || req.user._id?.toString();
    
    const availableBalance = await this.paymentsService.getAvailableBalance(coachId);
    
    return {
      availableBalance: availableBalance,
      currency: 'usd'
    };
  }

  /**
   * GET /payments/coach/withdraw/history
   * Récupérer l'historique des retraits
   */
  @Get('coach/withdraw/history')
  @ApiOperation({
    summary: 'Get withdrawal history',
    description: 'Returns the withdrawal history for the authenticated coach',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of withdrawals to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        withdraws: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              withdrawId: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' },
              paymentMethod: { type: 'string' },
              createdAt: { type: 'string' },
              processedAt: { type: 'string', nullable: true },
              completedAt: { type: 'string', nullable: true },
              failureReason: { type: 'string', nullable: true }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWithdrawHistory(
    @Request() req,
    @Query('limit') limit?: number
  ) {
    const coachId = req.user.sub || req.user._id?.toString();
    
    const history = await this.paymentsService.getWithdrawHistory(
      coachId,
      limit ? parseInt(limit.toString()) : 50
    );
    
    return {
      withdraws: history,
      total: history.length
    };
  }
}

