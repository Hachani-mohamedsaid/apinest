import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
}

