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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * Créer un review pour une activité
   */
  @Post()
  @ApiOperation({ summary: 'Create a review for an activity' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Review already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    const review = await this.reviewsService.createReview(
      createReviewDto.activityId,
      req.user.sub, // userId depuis le token JWT
      createReviewDto.rating,
      createReviewDto.comment,
    );

    return {
      success: true,
      message: 'Review submitted successfully',
      review,
    };
  }

  /**
   * GET /reviews/activity/:activityId
   * Récupérer tous les reviews d'une activité
   */
  @Get('activity/:activityId')
  @ApiOperation({ summary: 'Get all reviews for an activity' })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActivityReviews(@Param('activityId') activityId: string) {
    const result = await this.reviewsService.getActivityReviews(activityId);
    return result;
  }

  /**
   * GET /reviews/coach
   * Récupère les reviews reçus par le coach
   */
  @Get('coach')
  @ApiOperation({
    summary: 'Get coach reviews',
    description: 'Retrieves all reviews received by the authenticated coach',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of reviews to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Coach reviews retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCoachReviews(@Request() req, @Query('limit') limit?: number) {
    const coachId = req.user.sub;
    return this.reviewsService.getCoachReviews(coachId, limit || 50);
  }
}

