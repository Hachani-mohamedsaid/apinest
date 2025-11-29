import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  /**
   * Créer un review pour une activité
   */
  async createReview(
    activityId: string,
    userId: string,
    rating: number,
    comment?: string,
  ): Promise<ReviewDocument> {
    this.validateObjectId(activityId);
    this.validateObjectId(userId);

    // Vérifier que l'activité existe
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier que l'utilisateur est participant de l'activité
    const isParticipant = activity.participantIds?.some(
      (id) => id.toString() === userId,
    );
    if (!isParticipant) {
      throw new ConflictException(
        'You must be a participant to review this activity',
      );
    }

    // Vérifier qu'un review n'existe pas déjà
    const existingReview = await this.reviewModel
      .findOne({
        activityId: new Types.ObjectId(activityId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (existingReview) {
      throw new ConflictException('You have already reviewed this activity');
    }

    // Créer le review
    const review = new this.reviewModel({
      activityId: new Types.ObjectId(activityId),
      userId: new Types.ObjectId(userId),
      rating,
      comment: comment || null,
    });

    const savedReview = await review.save();
    this.logger.log(
      `Review created: activityId=${activityId}, userId=${userId}, rating=${rating}`,
    );

    return savedReview;
  }

  /**
   * Récupérer tous les reviews d'une activité
   */
  async getActivityReviews(activityId: string): Promise<{
    reviews: ReviewDocument[];
    averageRating: number;
    totalReviews: number;
  }> {
    this.validateObjectId(activityId);

    const reviews = await this.reviewModel
      .find({ activityId: new Types.ObjectId(activityId) })
      .populate('userId', 'name profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          totalReviews
        : 0;

    return {
      reviews,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      totalReviews,
    };
  }

  /**
   * Vérifier si un utilisateur a déjà laissé un review pour une activité
   */
  async hasUserReviewed(activityId: string, userId: string): Promise<boolean> {
    this.validateObjectId(activityId);
    this.validateObjectId(userId);

    const review = await this.reviewModel
      .findOne({
        activityId: new Types.ObjectId(activityId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return !!review;
  }

  /**
   * Valide qu'un ID est un ObjectId MongoDB valide
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID format: "${id}"`);
    }
  }
}

