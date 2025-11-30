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
import { ActivitiesService } from '../activities/activities.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    private readonly activitiesService: ActivitiesService,
    private readonly usersService: UsersService,
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
      this.logger.log('[getReviewsByActivityIds] No activity IDs provided');
      return [];
    }

    // Convertir les IDs en ObjectId avec gestion d'erreur
    const objectIds = activityIds
      .map((id) => {
        try {
          if (Types.ObjectId.isValid(id)) {
            return new Types.ObjectId(id);
          } else {
            this.logger.warn(`[getReviewsByActivityIds] Invalid activityId: ${id}`);
            return null;
          }
        } catch (e) {
          this.logger.error(`[getReviewsByActivityIds] Error converting activityId ${id}:`, e);
          return null;
        }
      })
      .filter((id) => id !== null) as Types.ObjectId[];

    if (objectIds.length === 0) {
      this.logger.warn('[getReviewsByActivityIds] No valid activity IDs after conversion');
      return [];
    }

    this.logger.log(
      `[getReviewsByActivityIds] Searching reviews for ${objectIds.length} activities (from ${activityIds.length} provided)`,
    );

    const reviews = await this.reviewModel
      .find({ activityId: { $in: objectIds } })
      .populate('userId', 'name profileImageUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    this.logger.log(`[getReviewsByActivityIds] Found ${reviews.length} reviews`);
    return reviews;
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

    this.logger.log(`[getCoachReviews] Fetching reviews for coach: ${coachId}`);

    // Récupérer toutes les activités créées par ce coach
    // Utiliser getActivitiesByCreator pour être cohérent
    const coachActivities = await this.activitiesService.getActivitiesByCreator(coachId);

    this.logger.log(
      `[getCoachReviews] Found ${coachActivities.length} activities for coach ${coachId}`,
    );
    
    // Debug: Log quelques activités pour vérifier
    if (coachActivities.length > 0) {
      coachActivities.slice(0, 3).forEach((activity) => {
        const creatorId = typeof activity.creator === 'object' && activity.creator !== null
          ? (activity.creator as any)._id?.toString() || activity.creator.toString()
          : activity.creator.toString();
        this.logger.debug(
          `[getCoachReviews] Activity ${activity._id.toString()}: title=${activity.title}, creator=${creatorId}, isCompleted=${activity.isCompleted}, price=${activity.price || 0}`,
        );
      });
    }

    // ✅ Filtrer seulement les activités complétées avec prix > 0 (coach activities)
    const completedCoachActivities = coachActivities.filter(
      (activity) => activity.isCompleted === true && activity.price && activity.price > 0,
    );
    
    this.logger.log(
      `[getCoachReviews] Found ${completedCoachActivities.length} completed coach activities (with price > 0) out of ${coachActivities.length} total activities`,
    );

    if (completedCoachActivities.length === 0) {
      this.logger.warn(
        `[getCoachReviews] No completed coach activities (with price > 0) found for coach ${coachId}, returning empty reviews`,
      );
      
      // Debug: Vérifier s'il y a des reviews dans la base
      const allReviewsCount = await this.reviewModel.countDocuments({}).exec();
      this.logger.log(
        `[getCoachReviews] Total reviews in database: ${allReviewsCount}`,
      );
      
      if (allReviewsCount > 0) {
        // Récupérer quelques reviews pour voir leurs activityIds
        const sampleReviews = await this.reviewModel
          .find({})
          .limit(5)
          .select('activityId')
          .exec();
        const sampleActivityIds = sampleReviews.map((r) => r.activityId.toString());
        this.logger.log(
          `[getCoachReviews] Sample review activityIds: ${sampleActivityIds.join(', ')}`,
        );
        
        // Vérifier qui a créé ces activités
        for (const review of sampleReviews) {
          const activity = await this.activityModel
            .findById(review.activityId)
            .select('creator title')
            .exec();
          if (activity) {
            this.logger.log(
              `[getCoachReviews] Activity ${review.activityId.toString()} created by ${activity.creator.toString()}, title: ${activity.title}`,
            );
          } else {
            this.logger.warn(
              `[getCoachReviews] Activity ${review.activityId.toString()} not found in database`,
            );
          }
        }
      }
      
      return {
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
      };
    }

    // ✅ Utiliser seulement les activités complétées avec prix > 0
    const activityIds = completedCoachActivities.map((a) => a._id.toString());
    this.logger.log(
      `[getCoachReviews] Looking for reviews for ${activityIds.length} activities: ${activityIds.join(', ')}`,
    );

    // Récupérer les reviews pour ces activités
    const reviews = await this.getReviewsByActivityIds(activityIds, limit);

    this.logger.log(
      `[getCoachReviews] Found ${reviews.length} reviews for coach ${coachId}`,
    );

    // Créer un map pour accéder rapidement aux activités (seulement les complétées)
    const activitiesMap = new Map();
    completedCoachActivities.forEach((activity) => {
      activitiesMap.set(activity._id.toString(), activity);
    });

    // Enrichir avec les informations de l'activité et de l'utilisateur
    const enrichedReviews = reviews.map((review) => {
      const activity = activitiesMap.get(review.activityId.toString());
      
      // Gérer le populate de userId
      let userName = 'Unknown';
      let userAvatar: string | null = null;
      
      if (review.userId) {
        // Si userId est populé (objet avec toObject)
        if (typeof review.userId === 'object' && 'toObject' in review.userId) {
          const userObj = (review.userId as any).toObject();
          userName = userObj?.name || 'Unknown';
          userAvatar = userObj?.profileImageUrl || null;
        } else if (typeof review.userId === 'object' && 'name' in review.userId) {
          // Si userId est déjà un objet avec name
          userName = (review.userId as any).name || 'Unknown';
          userAvatar = (review.userId as any).profileImageUrl || null;
        }
      }
      
      const reviewObj = review.toObject ? review.toObject() : review;
      const createdAt = (reviewObj as any).createdAt || new Date();

      return {
        _id: review._id.toString(),
        id: review._id.toString(),
        activityId: review.activityId.toString(),
        activityTitle: activity?.title || 'Unknown Activity',
        userId: (() => {
          if (typeof review.userId === 'object' && review.userId !== null && '_id' in review.userId) {
            return (review.userId as any)._id.toString();
          } else if (typeof review.userId === 'object' && review.userId !== null) {
            return String(review.userId);
          } else {
            return review.userId.toString();
          }
        })(),
        userName: userName,
        userAvatar: userAvatar,
        rating: review.rating,
        comment: review.comment || null,
        createdAt: createdAt,
      };
    });

    // Calculer la moyenne
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating =
      reviews.length > 0 ? totalRating / reviews.length : 0;

    this.logger.log(
      `Returning ${enrichedReviews.length} reviews with average rating ${averageRating} for coach ${coachId}`,
    );

    return {
      reviews: enrichedReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      totalReviews: reviews.length,
    };
  }

  /**
   * Méthode de debug pour diagnostiquer les problèmes de reviews
   */
  async debugCoachReviews(coachId: string): Promise<any> {
    this.validateObjectId(coachId);

    this.logger.log(`[DEBUG] Starting debug for coach: ${coachId}`);

    // 1. Récupérer toutes les activités créées par ce coach
    const coachActivities = await this.activityModel
      .find({ creator: new Types.ObjectId(coachId) })
      .exec();

    this.logger.log(`[DEBUG] Coach ${coachId} has ${coachActivities.length} activities`);

    const coachActivityIds = coachActivities.map((a) => a._id.toString());

    // 2. Récupérer TOUS les reviews dans la base (sans filtre)
    const allReviews = await this.reviewModel.find({}).exec();

    this.logger.log(`[DEBUG] Total reviews in database: ${allReviews.length}`);

    const allReviewActivityIds = allReviews.map((r) => r.activityId.toString());

    // 3. Vérifier quelles activités des reviews existent et qui les a créées
    const reviewActivitiesInfo = await Promise.all(
      allReviews.map(async (review) => {
        const activityId = review.activityId.toString();
        const activity = await this.activityModel.findById(activityId).exec();

        return {
          reviewId: review._id.toString(),
          activityId: activityId,
          activityExists: !!activity,
          activityCreator: activity?.creator?.toString() || null,
          activityTitle: activity?.title || null,
          isCoachActivity: coachActivityIds.includes(activityId),
        };
      }),
    );

    // 4. Récupérer les reviews pour les activités du coach
    const reviewsForCoach = await this.getReviewsByActivityIds(
      coachActivityIds,
      50,
    );

    this.logger.log(
      `[DEBUG] Reviews for coach activities: ${reviewsForCoach.length}`,
    );

    return {
      coachId,
      coachActivitiesCount: coachActivities.length,
      coachActivityIds: coachActivityIds,
      coachActivities: coachActivities.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        creator: a.creator.toString(),
      })),
      allReviewsCount: allReviews.length,
      allReviewActivityIds: allReviewActivityIds,
      allReviews: allReviews.map((r) => ({
        id: r._id.toString(),
        activityId: r.activityId.toString(),
        userId: r.userId.toString(),
        rating: r.rating,
        comment: r.comment,
      })),
      reviewActivitiesInfo: reviewActivitiesInfo,
      reviewsForCoachCount: reviewsForCoach.length,
      reviewsForCoach: reviewsForCoach.map((r) => ({
        id: r._id.toString(),
        activityId: r.activityId.toString(),
        userId: r.userId.toString(),
        rating: r.rating,
        comment: r.comment,
      })),
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

