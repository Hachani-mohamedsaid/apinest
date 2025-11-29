import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

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
}

