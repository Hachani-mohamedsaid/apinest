import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { XpService } from '../achievements/services/xp.service';
import { StreakService } from '../achievements/services/streak.service';
import { BadgeService } from '../achievements/services/badge.service';
import { ChallengeService } from '../achievements/services/challenge.service';
import { NotificationService } from '../achievements/services/notification.service';
import { NotificationType } from '../achievements/schemas/notification.schema';
import { ActivityLog, ActivityLogDocument } from '../achievements/schemas/activity-log.schema';
import { Match, MatchDocument } from '../quick-match/schemas/match.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLogDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly xpService: XpService,
    private readonly streakService: StreakService,
    private readonly badgeService: BadgeService,
    private readonly challengeService: ChallengeService,
    private readonly notificationService: NotificationService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Valide qu'un ID est un ObjectId MongoDB valide
   * @param id L'ID à valider
   * @throws BadRequestException si l'ID n'est pas valide
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID format: "${id}". Expected a valid MongoDB ObjectId.`);
    }
  }

  async create(createActivityDto: CreateActivityDto, userId: string): Promise<ActivityDocument> {
    this.logger.log(
      `[ActivitiesService] ========================================`,
    );
    this.logger.log(
      `[ActivitiesService] 🎯 CREATE ACTIVITY called for user ${userId}`,
    );
    this.logger.log(
      `[ActivitiesService] Activity data: sportType=${createActivityDto.sportType}, title=${createActivityDto.title}`,
    );
    this.logger.log(
      `[ActivitiesService] ========================================`,
    );
    
    // ✅ NOUVEAU : Vérifier que l'utilisateur existe
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // ✅ MODIFICATION : Vérifier si c'est une session (price > 0)
    const price = createActivityDto.price;
    const isSession = price !== undefined && price !== null && price > 0;

    // ✅ Vérifier que si un prix est fourni, l'utilisateur doit être un coach vérifié
    if (isSession) {
      if (!user.isCoachVerified) {
        throw new BadRequestException('Only verified coaches can create paid sessions');
      }
      if (createActivityDto.price < 0) {
        throw new BadRequestException('Price must be greater than or equal to 0');
      }
      this.logger.log(
        `[ActivitiesService] 💰 Creating paid session with price: ${createActivityDto.price} by verified coach ${userId}`,
      );

      // ✅ Vérifier la limite de subscription UNIQUEMENT pour les sessions
      const limitCheck = await this.subscriptionService.checkActivityLimit(userId);
      
      if (!limitCheck.canCreate) {
        this.logger.warn(
          `[ActivitiesService] ❌ Session creation blocked for user ${userId}: ${limitCheck.message}`,
        );
        throw new ForbiddenException(limitCheck.message || 'Session limit reached');
      }

      this.logger.log(
        `[ActivitiesService] ✅ Session limit check passed for user ${userId}. Activities remaining: ${limitCheck.activitiesRemaining === -1 ? 'unlimited' : limitCheck.activitiesRemaining}`,
      );
    } else {
      // ✅ Activité normale : Pas de vérification de limite
      this.logger.log(
        `[ActivitiesService] ✅ Creating normal activity (no price) for user ${userId} - No limit check needed`,
      );
    }
    
    // Combine date and time into a single datetime
    const activityDateTime = this.combineDateAndTime(createActivityDto.date, createActivityDto.time);

    const activityData = {
      ...createActivityDto,
      creator: userId,
      date: new Date(createActivityDto.date),
      time: activityDateTime,
    };

    const createdActivity = new this.activityModel(activityData);
    // Le créateur est automatiquement ajouté aux participants
    createdActivity.participantIds = [userId as any];
    const savedActivity = await createdActivity.save();
    
    this.logger.log(
      `[ActivitiesService] ✅ Activity created successfully: id=${savedActivity._id}, title="${savedActivity.title}"`,
    );

    // ✅ MODIFICATION : Incrémenter le compteur SEULEMENT pour les sessions
    // (price et isSession sont déjà définis plus haut)
    if (isSession) {
      try {
        await this.subscriptionService.incrementActivityCount(userId);
        this.logger.log(
          `✅ Session created by user ${userId} (price=${price}), count incremented`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error incrementing session count: ${error.message}`,
          error.stack,
        );
        // Ne pas bloquer la création si l'incrémentation échoue
      }
    } else {
      this.logger.log(
        `✅ Normal activity created by user ${userId} (price=null), no count increment`,
      );
    }

    // Award XP for hosting event
    await this.xpService.addXp(userId, XpService.XP_REWARDS.HOST_EVENT, 'host_event');

    // Vérifier et débloquer les badges de création d'activité
    try {
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );
      this.logger.log(
        `[ActivitiesService] 🏆 CHECKING BADGES for user ${userId} after activity creation`,
      );
      this.logger.log(
        `[ActivitiesService] Activity: sportType=${savedActivity.sportType}, isHost=true`,
      );
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );
      
      await this.badgeService.checkAndAwardBadges(userId, 'activity_created', {
        action: 'create_activity',
        activity: {
          sportType: savedActivity.sportType,
          isHost: true,
        },
      });
      
      this.logger.log(
        `[ActivitiesService] ✅ Badge check completed for user ${userId}`,
      );
    } catch (error) {
      // Ne pas bloquer la création si la vérification de badge échoue
      this.logger.error(
        `[ActivitiesService] ❌ ERROR checking badges for activity creation: ${error.message}`,
        error.stack,
      );
    }

    // Activate challenges for user (if not already activated)
    try {
      this.logger.log(
        `[ActivitiesService] Activating challenges for user ${userId} after activity creation`,
      );
      await this.challengeService.activateChallengesForUser(userId);
    } catch (error) {
      this.logger.error(
        `Error activating challenges for activity creation: ${error.message}`,
      );
    }

    // Update challenges (pour les challenges qui comptent la création d'activité)
    // Important: Pour les challenges quotidiens, on utilise la date de création (aujourd'hui)
    const creationDate = new Date(); // Date actuelle = date de création
    try {
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );
      this.logger.log(
        `[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for user ${userId} after activity CREATION`,
      );
      this.logger.log(
        `[ActivitiesService] Creation date: ${creationDate.toISOString()}`,
      );
      this.logger.log(
        `[ActivitiesService] Activity data: sportType=${savedActivity.sportType}, date=${savedActivity.date}`,
      );
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );

      await this.challengeService.updateChallengeProgress(userId, 'create_activity', {
        activity: {
          sportType: savedActivity.sportType,
          date: creationDate, // Utiliser la date de création pour les challenges quotidiens
          time: creationDate, // Utiliser la date de création
          createdAt: creationDate, // Date de création explicite
          durationMinutes: 0, // Pas encore complétée
          distanceKm: 0, // Pas encore complétée
        },
      });

      this.logger.log(
        `[ActivitiesService] ✅ Challenge progress update completed for user ${userId} after activity creation`,
      );
    } catch (error) {
      this.logger.error(
        `[ActivitiesService] ❌ ERROR updating challenge progress for user ${userId} after activity creation: ${error.message}`,
        error.stack,
      );
      // Ne pas bloquer la création d'activité si la mise à jour des challenges échoue
    }

    return savedActivity;
  }

  async findAll(visibility?: string, userId?: string): Promise<ActivityDocument[]> {
    if (visibility === 'friends') {
      // Pour "friends", nécessite authentification
      if (!userId) {
        throw new UnauthorizedException(
          'Authentication required for friends visibility',
        );
      }

      return this.getFriendsActivities(userId);
    }

    // Pour "public" ou par défaut, retourner toutes les activités publiques
    // Filtrer les activités terminées
    const query: any = {
      visibility: 'public',
      isCompleted: { $ne: true }, // Exclure les activités terminées
    };

    return this.activityModel
      .find(query)
      .populate('creator', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Récupérer les activités "friends"
   * Retourne uniquement les activités créées par :
   * - L'utilisateur connecté
   * - Les utilisateurs avec qui il a matché (likes mutuels dans QuickMatch)
   */
  private async getFriendsActivities(userId: string): Promise<ActivityDocument[]> {
    try {
      // 1. Récupérer tous les matches de l'utilisateur
      const matches = await this.matchModel
        .find({
          $or: [
            { user1: new Types.ObjectId(userId) },
            { user2: new Types.ObjectId(userId) },
          ],
        })
        .exec();

      // 2. Extraire les IDs des utilisateurs avec qui on a matché
      const matchedUserIds = matches.map((match) => {
        // Déterminer l'autre utilisateur (pas l'utilisateur connecté)
        if (match.user1.toString() === userId) {
          return match.user2;
        } else {
          return match.user1;
        }
      });

      // 3. Ajouter l'utilisateur connecté lui-même (pour voir ses propres activités)
      const allowedUserIds = [
        new Types.ObjectId(userId),
        ...matchedUserIds,
      ];

      this.logger.log(
        `[ActivitiesService] Getting friends activities for user ${userId}. Matches found: ${matches.length}, Allowed users: ${allowedUserIds.length}`,
      );

      // 4. Récupérer les activités créées par ces utilisateurs avec visibility="friends"
      // Filtrer les activités terminées
      const activities = await this.activityModel
        .find({
          creator: { $in: allowedUserIds },
          visibility: 'friends',
          isCompleted: { $ne: true }, // Exclure les activités terminées
        })
        .populate('creator', 'name email profileImageUrl')
        .sort({ createdAt: -1 })
        .exec();

      this.logger.log(
        `[ActivitiesService] Found ${activities.length} friends activities for user ${userId}`,
      );

      return activities;
    } catch (error) {
      this.logger.error(
        `[ActivitiesService] Error getting friends activities: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Récupérer uniquement les sessions de coach (avec prix)
   * @param visibility - Filtre par visibilité ('public' ou 'friends')
   * @param userId - ID de l'utilisateur (requis pour 'friends')
   */
  async findCoachSessions(visibility?: string, userId?: string): Promise<ActivityDocument[]> {
    if (visibility === 'friends') {
      // Pour "friends", nécessite authentification
      if (!userId) {
        throw new UnauthorizedException(
          'Authentication required for friends visibility',
        );
      }
      return this.getFriendsCoachSessions(userId);
    }

    // Pour "public" ou par défaut, retourner les sessions de coach publiques
    // Filtrer les activités terminées
    const query: any = {
      visibility: 'public',
      price: { $exists: true, $gt: 0 },
      isCompleted: { $ne: true },
    };

    return this.activityModel
      .find(query)
      .populate('creator', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Récupérer uniquement les activités individuelles (sans prix)
   * @param visibility - Filtre par visibilité ('public' ou 'friends')
   * @param userId - ID de l'utilisateur (requis pour 'friends')
   */
  async findIndividualActivities(visibility?: string, userId?: string): Promise<ActivityDocument[]> {
    if (visibility === 'friends') {
      // Pour "friends", nécessite authentification
      if (!userId) {
        throw new UnauthorizedException(
          'Authentication required for friends visibility',
        );
      }
      return this.getFriendsIndividualActivities(userId);
    }

    // Pour "public" ou par défaut, retourner les activités individuelles publiques
    // Filtrer les activités terminées
    const query: any = {
      visibility: 'public',
      $or: [
        { price: { $exists: false } },
        { price: null },
        { price: 0 },
      ],
      isCompleted: { $ne: true },
    };

    return this.activityModel
      .find(query)
      .populate('creator', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Récupérer les sessions de coach "friends"
   */
  private async getFriendsCoachSessions(userId: string): Promise<ActivityDocument[]> {
    try {
      // 1. Récupérer tous les matches de l'utilisateur
      const matches = await this.matchModel
        .find({
          $or: [
            { user1: new Types.ObjectId(userId) },
            { user2: new Types.ObjectId(userId) },
          ],
        })
        .exec();

      // 2. Extraire les IDs des utilisateurs avec qui on a matché
      const matchedUserIds = matches.map((match) => {
        if (match.user1.toString() === userId) {
          return match.user2;
        } else {
          return match.user1;
        }
      });

      // 3. Ajouter l'utilisateur connecté lui-même
      const allowedUserIds = [
        new Types.ObjectId(userId),
        ...matchedUserIds,
      ];

      // 4. Récupérer les sessions de coach créées par ces utilisateurs avec visibility="friends"
      // Filtrer les activités terminées
      const activities = await this.activityModel
        .find({
          creator: { $in: allowedUserIds },
          visibility: 'friends',
          price: { $exists: true, $gt: 0 },
          isCompleted: { $ne: true },
        })
        .populate('creator', 'name email profileImageUrl')
        .sort({ createdAt: -1 })
        .exec();

      return activities;
    } catch (error) {
      this.logger.error(
        `[ActivitiesService] Error getting friends coach sessions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Récupérer les activités individuelles "friends"
   */
  private async getFriendsIndividualActivities(userId: string): Promise<ActivityDocument[]> {
    try {
      // 1. Récupérer tous les matches de l'utilisateur
      const matches = await this.matchModel
        .find({
          $or: [
            { user1: new Types.ObjectId(userId) },
            { user2: new Types.ObjectId(userId) },
          ],
        })
        .exec();

      // 2. Extraire les IDs des utilisateurs avec qui on a matché
      const matchedUserIds = matches.map((match) => {
        if (match.user1.toString() === userId) {
          return match.user2;
        } else {
          return match.user1;
        }
      });

      // 3. Ajouter l'utilisateur connecté lui-même
      const allowedUserIds = [
        new Types.ObjectId(userId),
        ...matchedUserIds,
      ];

      // 4. Récupérer les activités individuelles créées par ces utilisateurs avec visibility="friends"
      // Filtrer les activités terminées
      const activities = await this.activityModel
        .find({
          creator: { $in: allowedUserIds },
          visibility: 'friends',
          $or: [
            { price: { $exists: false } },
            { price: null },
            { price: 0 },
          ],
          isCompleted: { $ne: true },
        })
        .populate('creator', 'name email profileImageUrl')
        .sort({ createdAt: -1 })
        .exec();

      return activities;
    } catch (error) {
      this.logger.error(
        `[ActivitiesService] Error getting friends individual activities: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findMyActivities(userId: string): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ creator: userId })
      .populate('creator', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ActivityDocument> {
    this.validateObjectId(id);
    
    const activity = await this.activityModel
      .findById(id)
      .populate('creator', 'name email profileImageUrl')
      .exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
    userId: string,
  ): Promise<ActivityDocument> {
    this.validateObjectId(id);
    
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    // Check if user is the creator
    if (activity.creator.toString() !== userId) {
      throw new ForbiddenException('You can only update your own activities');
    }

    // If date or time is being updated, combine them
    const updateData: any = { ...updateActivityDto };

    if (updateActivityDto.date || updateActivityDto.time) {
      const dateToUse = updateActivityDto.date || activity.date.toISOString().split('T')[0];
      const timeToUse = updateActivityDto.time || activity.time.toISOString();
      updateData.time = this.combineDateAndTime(dateToUse, timeToUse);

      if (updateActivityDto.date) {
        updateData.date = new Date(updateActivityDto.date);
      }
    }

    const updatedActivity = await this.activityModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('creator', 'name email profileImageUrl')
      .exec();

    return updatedActivity;
  }

  async remove(id: string, userId: string): Promise<void> {
    this.validateObjectId(id);
    
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    // Check if user is the creator
    if (activity.creator.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own activities');
    }

    await this.activityModel.findByIdAndDelete(id).exec();
  }

  /**
   * Combines date (YYYY-MM-DD) and time (ISO string) into a single Date object
   */
  private combineDateAndTime(dateString: string, timeString: string): Date {
    try {
      const date = new Date(dateString);
      const time = new Date(timeString);

      // Extract date components
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      // Extract time components
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const seconds = time.getSeconds();
      const milliseconds = time.getMilliseconds();

      // Combine into a single Date object
      return new Date(year, month, day, hours, minutes, seconds, milliseconds);
    } catch (error) {
      throw new BadRequestException('Invalid date or time format');
    }
  }

  async joinActivity(activityId: string, userId: string) {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier si l'utilisateur est déjà participant
    const isAlreadyParticipant = activity.participantIds.some(
      (p: any) => p.toString() === userId,
    );
    if (isAlreadyParticipant) {
      throw new BadRequestException('Already joined this activity');
    }

    // Vérifier si l'activité est complète
    if (activity.isCompleted) {
      throw new BadRequestException('Activity is already completed');
    }

    // Vérifier si l'activité est pleine
    if (activity.participantIds.length >= activity.participants) {
      throw new BadRequestException('Activity is full');
    }

    // Ajouter l'utilisateur aux participants
    activity.participantIds.push(userId as any);
    await activity.save();

    // Award XP for joining event
    await this.xpService.addXp(userId, XpService.XP_REWARDS.JOIN_EVENT, 'join_event');

    const updatedActivity = await this.activityModel
      .findById(activityId)
      .populate('creator', 'name email profileImageUrl')
      .populate('participantIds', 'name email profileImageUrl')
      .exec();

    return {
      message: 'Successfully joined activity',
      activity: updatedActivity,
    };
  }

  async getParticipantsDetails(activityId: string) {
    this.validateObjectId(activityId);
    this.logger.debug(`[getParticipantsDetails] Getting participants for activity: ${activityId}`);
    
    // ✅ Récupérer l'activité avec populate pour obtenir les informations complètes des participants
    const activity = await this.activityModel
      .findById(activityId)
      .populate({
        path: 'participantIds',
        select: 'name profileImageUrl _id', // ✅ Sélectionner les champs nécessaires
        model: 'User',
      })
      .populate({
        path: 'creator',
        select: 'name profileImageUrl _id',
        model: 'User',
      })
      .exec();

    if (!activity) {
      this.logger.warn(`[getParticipantsDetails] Activity ${activityId} not found`);
      throw new NotFoundException('Activity not found');
    }

    // ✅ Extraire le creator ID (gérer différents formats)
    let creatorId: string;
    if (typeof activity.creator === 'object' && activity.creator !== null) {
      creatorId = activity.creator._id ? activity.creator._id.toString() : activity.creator.toString();
    } else {
      creatorId = activity.creator?.toString() || '';
    }

    if (!creatorId) {
      this.logger.warn(`[getParticipantsDetails] Activity creator not found for activity ${activityId}`);
      throw new NotFoundException('Activity creator not found');
    }

    if (!activity.participantIds || activity.participantIds.length === 0) {
      this.logger.debug(`[getParticipantsDetails] No participants found for activity ${activityId}`);
      return { participants: [] };
    }

    // ✅ Convertir les participants peuplés en DTO
    const participants: any[] = [];
    
    // Filtrer les participants null/undefined
    const validParticipants = activity.participantIds.filter((p: any) => p != null);
    
    for (const participant of validParticipants) {
      // Vérifier que le participant est bien peuplé (populated)
      if (participant && participant._id) {
        // ✅ Extraire le nom - gérer les cas où participant est un objet User ou un ObjectId
        let participantName: string | null = null;
        let participantAvatar: string | null = null;
        let participantId: string;

        const participantObj = participant as any;
        if (typeof participant === 'object' && participantObj.name !== undefined) {
          // Participant est peuplé (objet User)
          participantName = participantObj.name || null;
          participantAvatar = participantObj.profileImageUrl || null;
          participantId = participantObj._id.toString();
        } else if (typeof participant === 'object' && participant._id) {
          // Participant a un _id mais pas de name (peut-être pas peuplé correctement)
          participantId = participant._id.toString();
          this.logger.warn(`[getParticipantsDetails] Participant ${participantId} is not fully populated, fetching user details...`);
          
          // Fallback : fetch l'utilisateur directement
          try {
            const user = await this.userModel.findById(participantId).select('name profileImageUrl').exec();
            if (user) {
              participantName = user.name || null;
              participantAvatar = user.profileImageUrl || null;
            }
          } catch (error) {
            this.logger.error(`[getParticipantsDetails] Error fetching user ${participantId}: ${error.message}`);
          }
        } else {
          // Participant n'est pas peuplé (ObjectId) - ne devrait pas arriver avec populate
          participantId = participant.toString();
          this.logger.warn(`[getParticipantsDetails] Participant ${participantId} is not populated, fetching user details...`);
          
          // Fallback : fetch l'utilisateur directement
          try {
            const user = await this.userModel.findById(participantId).select('name profileImageUrl').exec();
            if (user) {
              participantName = user.name || null;
              participantAvatar = user.profileImageUrl || null;
            }
          } catch (error) {
            this.logger.error(`[getParticipantsDetails] Error fetching user ${participantId}: ${error.message}`);
          }
        }

        participants.push({
          _id: participantId,
          id: participantId,
          name: participantName, // ✅ Retourner le nom (peut être null si l'utilisateur n'a pas de nom)
          profileImageUrl: participantAvatar,
          isHost: participantId === creatorId,
          joinedAt: (activity as any).createdAt || new Date(), // Utiliser createdAt comme approximation
        });

        this.logger.debug(
          `[getParticipantsDetails] Participant ${participantId}: name=${participantName || 'null'}, avatar=${participantAvatar || 'null'}, isHost=${participantId === creatorId}`,
        );
      }
    }

    // ✅ Inclure le créateur dans les participants (s'il n'est pas déjà présent)
    const isCreatorInParticipants = participants.some((p) => p.id === creatorId);
    if (!isCreatorInParticipants) {
      let creatorName: string | null = null;
      let creatorAvatar: string | null = null;

      if (typeof activity.creator === 'object' && activity.creator !== null) {
        const creatorObj = activity.creator as any;
        if (creatorObj.name !== undefined) {
          creatorName = creatorObj.name || null;
          creatorAvatar = creatorObj.profileImageUrl || null;
        } else {
          // Fallback : fetch le créateur directement
          try {
            const creatorUser = await this.userModel.findById(creatorId).select('name profileImageUrl').exec();
            if (creatorUser) {
              creatorName = creatorUser.name || null;
              creatorAvatar = creatorUser.profileImageUrl || null;
            }
          } catch (error) {
            this.logger.error(`[getParticipantsDetails] Error fetching creator ${creatorId}: ${error.message}`);
          }
        }
      }

      participants.unshift({
        _id: creatorId,
        id: creatorId,
        name: creatorName,
        profileImageUrl: creatorAvatar,
        isHost: true,
        joinedAt: (activity as any).createdAt || new Date(),
      });

      this.logger.debug(
        `[getParticipantsDetails] Creator ${creatorId}: name=${creatorName || 'null'}, avatar=${creatorAvatar || 'null'}`,
      );
    }

    this.logger.log(`[getParticipantsDetails] Returning ${participants.length} participants for activity ${activityId}`);
    return { participants };
  }

  async leaveActivity(activityId: string, userId: string) {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier si l'utilisateur est le créateur
    if (activity.creator.toString() === userId) {
      throw new BadRequestException('Host cannot leave the activity');
    }

    // Vérifier si l'utilisateur est participant
    const isParticipant = activity.participantIds.some(
      (p: any) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant of this activity');
    }

    // Retirer l'utilisateur des participants
    activity.participantIds = activity.participantIds.filter(
      (p: any) => p.toString() !== userId,
    );
    await activity.save();

    return { message: 'Successfully left activity' };
  }

  async completeActivity(
    activityId: string,
    userId: string,
    durationMinutes?: number,
    distanceKm?: number,
  ) {
    this.logger.log(
      `[ActivitiesService] completeActivity called: activityId=${activityId}, userId=${userId}, durationMinutes=${durationMinutes}, distanceKm=${distanceKm}`,
    );
    
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      this.logger.error(`[ActivitiesService] Activity not found: ${activityId}`);
      throw new NotFoundException('Activity not found');
    }

    this.logger.log(
      `[ActivitiesService] Activity found: title="${activity.title}", sportType="${activity.sportType}", creator="${activity.creator}"`,
    );

    // Vérifier si l'utilisateur est le créateur
    if (activity.creator.toString() !== userId) {
      this.logger.warn(
        `[ActivitiesService] User ${userId} is not the creator of activity ${activityId}. Creator: ${activity.creator}`,
      );
      throw new ForbiddenException('Only the host can mark activity as complete');
    }

    this.logger.log(`[ActivitiesService] User is the creator, proceeding with completion...`);

    // Marquer l'activité comme complétée
    activity.isCompleted = true;
    await activity.save();
    
    this.logger.log(`[ActivitiesService] Activity marked as completed in database`);

    // Récupérer tous les participants (utilisé pour les notifications ET les activity logs)
    const participants = activity.participantIds || [];

    // Envoyer des notifications de review UNIQUEMENT pour les activités coach (avec price > 0)
    // Les activités individuelles (gratuites) ne nécessitent pas de review
    if (activity.price && activity.price > 0) {
      const participantsToNotify = participants.filter(
        (p: any) => p.toString() !== userId,
      );

      this.logger.log(
        `[ActivitiesService] Sending review notifications to ${participantsToNotify.length} participants for coach session (price: ${activity.price})`,
      );

      // Créer les notifications pour chaque participant
      for (const participantId of participantsToNotify) {
        try {
          await this.notificationService.createNotification(
            participantId.toString(),
            NotificationType.ACTIVITY_REVIEW_REQUEST,
            'Rate Your Session',
            `How was your last coach session "${activity.title}"? Tap to leave a rating and review.`,
            {
              activityId: activityId,
              activityName: activity.title,
              activityTitle: activity.title,
            },
          );
          this.logger.log(
            `[ActivitiesService] Review notification sent to participant ${participantId}`,
          );
        } catch (error) {
          this.logger.error(
            `[ActivitiesService] Error sending review notification to participant ${participantId}: ${error.message}`,
          );
          // Ne pas bloquer la complétion de l'activité si l'envoi de notification échoue
        }
      }
    } else {
      this.logger.log(
        `[ActivitiesService] Activity is free (no price), skipping review notifications`,
      );
    }

    // Create activity log for all participants
    // Réutiliser la variable participants déjà déclarée
    const activityDate = activity.date || activity.time || new Date();
    const defaultDuration = durationMinutes || 30; // Durée par défaut de 30 minutes si non fournie
    const defaultDistance = distanceKm || 0;

    // Log activity for each participant
    this.logger.log(
      `[ActivitiesService] Processing ${participants.length} participants for activity completion`,
    );
    
    for (const participantId of participants) {
      const participantIdStr = participantId.toString();
      const participantIsHost = participantIdStr === activity.creator.toString();

      this.logger.log(
        `[ActivitiesService] Processing participant: ${participantIdStr} (isHost: ${participantIsHost})`,
      );

      // Calculer l'XP selon la formule détaillée
      const xpEarned = this.xpService.calculateActivityXp(
        activity.sportType,
        defaultDuration,
        defaultDistance > 0 ? defaultDistance : undefined,
      );

      this.logger.log(
        `[ActivitiesService] XP calculated for participant ${participantIdStr}: ${xpEarned} XP`,
      );

      // Create activity log with detailed information
      await this.activityLogModel.create({
        userId: participantId,
        activityType: activity.sportType,
        activityName: activity.title,
        date: activityDate,
        xpEarned,
        isHost: participantIsHost,
        participantsCount: participants.length,
        durationMinutes: defaultDuration,
        distanceKm: defaultDistance,
      });

      // Award XP for completing activity (avec le calcul détaillé)
      this.logger.log(
        `[ActivitiesService] Adding ${xpEarned} XP to participant ${participantIdStr}`,
      );
      await this.xpService.addXp(participantIdStr, xpEarned, 'complete_activity');

      // Update streak
      this.logger.log(
        `[ActivitiesService] Updating streak for participant ${participantIdStr}`,
      );
      await this.streakService.updateStreak(participantIdStr, activityDate);

      // Check badges (peut débloquer des badges et donner de l'XP bonus)
      this.logger.log(
        `[ActivitiesService] Checking badges for participant ${participantIdStr}`,
      );
      await this.badgeService.checkAndAwardBadges(participantIdStr, 'activity_complete', {
        activity: {
          sportType: activity.sportType,
          date: activityDate,
          isHost: participantIsHost,
          durationMinutes: defaultDuration,
          distanceKm: defaultDistance,
        },
      });

      // Activate challenges for user (if not already activated)
      this.logger.log(
        `[ActivitiesService] Activating challenges for participant ${participantIdStr}`,
      );
      await this.challengeService.activateChallengesForUser(participantIdStr);

      // Update challenges (avec les informations détaillées)
      // Important: Pour les challenges quotidiens, on utilise la date de complétion (aujourd'hui)
      // pas la date de création de l'activité
      const completionDate = new Date(); // Date actuelle = date de complétion
      
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );
      this.logger.log(
        `[ActivitiesService] 🎯 UPDATING CHALLENGE PROGRESS for participant ${participantIdStr}`,
      );
      this.logger.log(
        `[ActivitiesService] Completion date: ${completionDate.toISOString()}`,
      );
      this.logger.log(
        `[ActivitiesService] Activity data: sportType=${activity.sportType}, duration=${defaultDuration}, distance=${defaultDistance}`,
      );
      this.logger.log(
        `[ActivitiesService] ========================================`,
      );
      
      try {
        await this.challengeService.updateChallengeProgress(participantIdStr, 'complete_activity', {
          activity: {
            sportType: activity.sportType,
            date: completionDate, // Utiliser la date de complétion pour les challenges quotidiens
            time: completionDate, // Utiliser la date de complétion
            completedAt: completionDate, // Date de complétion explicite
            durationMinutes: defaultDuration,
            distanceKm: defaultDistance,
          },
        });
        
        this.logger.log(
          `[ActivitiesService] ✅ Challenge progress update completed for participant ${participantIdStr}`,
        );
      } catch (error) {
        this.logger.error(
          `[ActivitiesService] ❌ ERROR updating challenge progress for participant ${participantIdStr}: ${error.message}`,
          error.stack,
        );
        // Ne pas bloquer la complétion d'activité si la mise à jour des challenges échoue
      }
    }
    
    this.logger.log(
      `[ActivitiesService] ✅ Activity completion processed for all ${participants.length} participants`,
    );

    return { message: 'Activity marked as complete' };
  }

  /**
   * Récupérer toutes les activités créées par un utilisateur
   */
  async getActivitiesByCreator(creatorId: string): Promise<ActivityDocument[]> {
    this.validateObjectId(creatorId);
    this.logger.log(`[getActivitiesByCreator] Getting activities for creator: ${creatorId}`);
    
    // ✅ Convertir creatorId en ObjectId
    const creatorObjectId = new Types.ObjectId(creatorId);
    
    // ✅ Chercher avec $or pour gérer les deux formats :
    // 1. creator est un ObjectId direct
    // 2. creator est un objet avec _id (après populate)
    const activities = await this.activityModel
      .find({
        $or: [
          { creator: creatorObjectId },
          { 'creator._id': creatorObjectId },
        ],
      })
      .populate('creator', 'name profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
    
    this.logger.log(`[getActivitiesByCreator] Found ${activities.length} activities for creator ${creatorId}`);
    
    // Log des premières activités pour debug
    if (activities.length > 0) {
      activities.slice(0, 3).forEach((activity) => {
        const creatorInfo =
          typeof activity.creator === 'object' && activity.creator !== null
            ? (activity.creator as any)._id?.toString() ||
              activity.creator.toString()
            : activity.creator?.toString() || 'unknown';
        this.logger.debug(
          `[getActivitiesByCreator] Activity ${activity._id}: title=${activity.title}, creator=${creatorInfo}, isCompleted=${activity.isCompleted}, price=${activity.price || 0}`,
        );
      });
    } else {
      this.logger.warn(
        `[getActivitiesByCreator] ⚠️ No activities found for creator ${creatorId}. Checking MongoDB directly...`,
      );
      // Vérifier directement dans MongoDB sans populate
      const directCheck = await this.activityModel
        .find({
          $or: [
            { creator: creatorObjectId },
            { 'creator._id': creatorObjectId },
          ],
        })
        .select('_id title creator isCompleted price')
        .limit(5)
        .lean()
        .exec();
      this.logger.log(
        `[getActivitiesByCreator] Direct MongoDB check found ${directCheck.length} activities`,
      );
      directCheck.forEach((activity: any) => {
        this.logger.debug(
          `[getActivitiesByCreator] Direct check - Activity ${activity._id}: title=${activity.title}, creator type=${typeof activity.creator}, isCompleted=${activity.isCompleted}`,
        );
      });
    }
    
    return activities;
  }

  /**
   * Récupérer une activité par son ID
   */
  async getActivityById(activityId: string): Promise<ActivityDocument | null> {
    this.validateObjectId(activityId);
    try {
      const activity = await this.activityModel
        .findById(new Types.ObjectId(activityId))
        .exec();
      return activity;
    } catch (e) {
      this.logger.error(`[getActivityById] Error finding activity ${activityId}:`, e);
      return null;
    }
  }

  async isUserParticipant(activityId: string, userId: string): Promise<boolean> {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    
    if (!activity) {
      return false;
    }

    // Vérifier si l'utilisateur est le créateur
    if (activity.creator.toString() === userId) {
      return true;
    }

    // Vérifier si l'utilisateur est dans la liste des participants
    return activity.participantIds.some(
      (p: any) => p.toString() === userId,
    );
  }

  /**
   * Extracts participant IDs from an ActivityDocument as an array of strings
   * Handles null/undefined values and both ObjectId and string types
   */
  getParticipants(activity: ActivityDocument): string[] {
    if (!activity.participantIds || activity.participantIds.length === 0) {
      return [];
    }

    return activity.participantIds
      .filter(p => p != null) // Filtrer les valeurs null/undefined
      .map(p => {
        // Gérer les cas où p est un ObjectId ou déjà une string
        if (typeof p === 'string') {
          return p;
        }
        if (p && p.toString) {
          return p.toString();
        }
        return null;
      })
      .filter((id): id is string => id != null); // Filtrer les null restants
  }

  async getActivityParticipants(activityId: string): Promise<any[]> {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel
      .findById(activityId)
      .populate('participantIds', 'name email profileImageUrl')
      .populate('creator', 'name email profileImageUrl')
      .exec();
    
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (!activity.participantIds || activity.participantIds.length === 0) {
      return [];
    }

    const participants: any[] = [];
    
    // Filtrer les participants null/undefined avant de les traiter
    const validParticipants = activity.participantIds.filter(p => p != null);
    
    for (const participant of validParticipants) {
      // Vérifier que le participant est bien peuplé (populated)
      // Type assertion pour indiquer que c'est un objet peuplé, pas juste un ObjectId
      const populatedParticipant = participant as any;
      if (populatedParticipant && populatedParticipant._id) {
        participants.push({
          id: populatedParticipant._id.toString(),
          name: populatedParticipant.name || 'Unknown',
          profileImageUrl: populatedParticipant.profileImageUrl || null,
        });
      }
    }

    // Inclure le créateur dans les participants (si défini et pas déjà présent)
    // Type assertion pour indiquer que le creator est peuplé
    const populatedCreator = activity.creator as any;
    if (populatedCreator && populatedCreator._id) {
      const creatorId = populatedCreator._id.toString();
      const isCreatorAlreadyIncluded = participants.some(p => p.id === creatorId);
      
      if (!isCreatorAlreadyIncluded) {
        participants.unshift({
          id: creatorId,
          name: populatedCreator.name || 'Unknown',
          profileImageUrl: populatedCreator.profileImageUrl || null,
        });
      }
    }

    return participants;
  }
}

