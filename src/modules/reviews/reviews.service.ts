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
   * Récupérer les reviews pour plusieurs activités
   */
  async getReviewsByActivityIds(
    activityIds: string[],
    limit: number = 50,
  ): Promise<ReviewDocument[]> {
    if (!activityIds || activityIds.length === 0) {
      return [];
    }

    const objectIds = activityIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return [];
    }

    return this.reviewModel
      .find({ activityId: { $in: objectIds } })
      .populate('userId', 'name profileImageUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Récupérer les reviews reçus par un coach
   */
  async getCoachReviews(
    coachId: string,
    limit: number = 50,
  ): Promise<{
    reviews: Array<{
      _id: string;
      id: string;
      activityId: string;
      activityTitle: string;
      userId: string;
      userName: string;
      userAvatar: string | null;
      rating: number;
      comment: string | null;
      createdAt: Date;
    }>;
    averageRating: number;
    totalReviews: number;
  }> {
    this.validateObjectId(coachId);

    // Récupérer toutes les activités créées par ce coach
    const coachActivities = await this.activityModel
      .find({ creator: new Types.ObjectId(coachId) })
      .exec();

    if (coachActivities.length === 0) {
      return {
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
      };
    }

    const activityIds = coachActivities.map((a) => a._id.toString());

    // Récupérer les reviews pour ces activités
    const reviews = await this.getReviewsByActivityIds(activityIds, limit);

    // Créer un map pour accéder rapidement aux activités
    const activitiesMap = new Map();
    coachActivities.forEach((activity) => {
      activitiesMap.set(activity._id.toString(), activity);
    });

    // Enrichir avec les informations de l'activité et de l'utilisateur
    const enrichedReviews = reviews.map((review) => {
      const activity = activitiesMap.get(review.activityId.toString());
      const user = (review.userId as any)?.toObject
        ? (review.userId as any).toObject()
        : review.userId;
      
      const reviewObj = review.toObject ? review.toObject() : review;
      const createdAt = (reviewObj as any).createdAt || new Date();

      return {
        _id: review._id.toString(),
        id: review._id.toString(),
        activityId: review.activityId.toString(),
        activityTitle: activity?.title || null,
        userId: review.userId.toString(),
        userName: user?.name || 'Unknown',
        userAvatar: user?.profileImageUrl || null,
        rating: review.rating,
        comment: review.comment || null,
        createdAt: createdAt,
      };
    });

    // Calculer la moyenne
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating =
      reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      reviews: enrichedReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      totalReviews: reviews.length,
    };
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

