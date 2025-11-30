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

    // ✅ MÉTHODE PRINCIPALE : Récupérer directement depuis les reviews (fallback qui fonctionne)
    // Cette méthode fonctionne car elle utilise getActivityById qui trouve bien les activités
    const allReviews = await this.reviewModel.find({}).exec();
    this.logger.log(`[getCoachReviews] Total reviews in database: ${allReviews.length}`);

    // Pour chaque review, vérifier si l'activité est créée par le coach ET est complétée avec prix > 0
    const coachActivityIds = new Set<string>();
    const coachActivities = new Map<string, any>(); // Stocker les activités pour éviter de les re-fetch

    for (const review of allReviews) {
      const activityId = typeof review.activityId === 'object' && review.activityId !== null
        ? (review.activityId as any).toString()
        : String(review.activityId);
      
      try {
        const activity = await this.activitiesService.getActivityById(activityId);
        if (activity) {
          // Vérifier le creator (gérer différents formats)
          const activityCreatorId = typeof activity.creator === 'object' && activity.creator !== null
            ? (activity.creator._id ? activity.creator._id.toString() : activity.creator.toString())
            : activity.creator?.toString() || '';
          
          // ✅ Vérifier que l'activité est créée par le coach, est complétée, et a un prix > 0
          if (activityCreatorId === coachId && 
              activity.isCompleted === true && 
              activity.price && activity.price > 0) {
            coachActivityIds.add(activityId);
            coachActivities.set(activityId, activity);
            this.logger.log(
              `[getCoachReviews] ✅ Activity ${activityId} created by ${coachId}, ` +
              `title: ${activity.title}, isCompleted: ${activity.isCompleted}, price: ${activity.price}`,
            );
          }
        }
      } catch (e) {
        this.logger.warn(`[getCoachReviews] Error fetching activity ${activityId}: ${e.message}`);
      }
    }

    this.logger.log(`[getCoachReviews] Found ${coachActivityIds.size} completed coach activities for coach ${coachId}`);

    if (coachActivityIds.size === 0) {
      this.logger.warn(`[getCoachReviews] No completed coach activities found for coach ${coachId}, returning empty reviews`);
      return {
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
      };
    }

    // ✅ Récupérer les reviews pour ces activités
    const reviews = await this.reviewModel
      .find({ 
        activityId: { $in: Array.from(coachActivityIds).map(id => new Types.ObjectId(id)) },
      })
      .populate('userId', 'name profileImageUrl')
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    this.logger.log(`[getCoachReviews] Found ${reviews.length} reviews for coach ${coachId}`);

    // ✅ Enrichir avec les informations activité
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const activityId = typeof review.activityId === 'object' && review.activityId !== null
          ? (review.activityId as any).toString()
          : String(review.activityId);
        
        // Utiliser l'activité déjà récupérée si disponible, sinon la fetch
        const activity = coachActivities.get(activityId) || 
          await this.activitiesService.getActivityById(activityId);
        
        let userId: string;
        if (typeof review.userId === 'object' && review.userId !== null) {
          if ('_id' in review.userId) {
            userId = (review.userId as any)._id.toString();
          } else {
            userId = String(review.userId);
          }
        } else {
          userId = String(review.userId);
        }
        
        let userName = 'Unknown User';
        let userAvatar: string | null = null;

        if (review.userId && typeof review.userId === 'object' && review.userId !== null) {
          if ('toObject' in review.userId) {
            const userObj = (review.userId as any).toObject();
            userName = userObj?.name || 'Unknown User';
            userAvatar = userObj?.profileImageUrl || null;
          } else if ('name' in review.userId) {
            userName = (review.userId as any).name || 'Unknown User';
            userAvatar = (review.userId as any).profileImageUrl || null;
          } else {
            // Si userId est un ObjectId, fetch l'utilisateur
            try {
              const user = await this.usersService.findById(userId);
              if (user) {
                userName = user.name || 'Unknown User';
                userAvatar = user.profileImageUrl || null;
              }
            } catch (error) {
              this.logger.warn(`[getCoachReviews] Could not fetch user details for ID ${userId}: ${error.message}`);
            }
          }
        }
        
        const reviewObj = review.toObject ? review.toObject() : review;
        const createdAt = (reviewObj as any).createdAt || new Date();

        return {
          _id: review._id.toString(),
          id: review._id.toString(),
          activityId: activityId,
          activityTitle: activity?.title || 'Unknown Activity',
          userId: userId,
          userName: userName,
          userAvatar: userAvatar,
          rating: review.rating,
          comment: review.comment || null,
          createdAt: createdAt,
        };
      }),
    );

    // ✅ Calculer la moyenne
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    this.logger.log(
      `[getCoachReviews] ✅ Returning ${enrichedReviews.length} reviews, ` +
      `averageRating: ${averageRating.toFixed(1)}, totalReviews: ${reviews.length}`,
    );

    return {
      reviews: enrichedReviews,
      averageRating: Math.round(averageRating * 10) / 10,
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

