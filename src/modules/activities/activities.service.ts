import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
import { ActivityLog, ActivityLogDocument } from '../achievements/schemas/activity-log.schema';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLogDocument>,
    private readonly xpService: XpService,
    private readonly streakService: StreakService,
    private readonly badgeService: BadgeService,
    private readonly challengeService: ChallengeService,
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

    // Award XP for hosting event
    await this.xpService.addXp(userId, XpService.XP_REWARDS.HOST_EVENT, 'host_event');

    // Vérifier et débloquer les badges de création d'activité
    try {
      await this.badgeService.checkAndAwardBadges(userId, 'activity_created', {
        action: 'create_activity',
        activity: {
          sportType: savedActivity.sportType,
          isHost: true,
        },
      });
    } catch (error) {
      // Ne pas bloquer la création si la vérification de badge échoue
      this.logger.error(`Error checking badges for activity creation: ${error.message}`);
    }

    return savedActivity;
  }

  async findAll(visibility?: string, userId?: string): Promise<ActivityDocument[]> {
    const query: any = {};

    // If visibility filter is provided
    if (visibility === 'friends') {
      // For friends visibility, user must be authenticated
      if (!userId) {
        throw new ForbiddenException('Authentication required to view friends-only activities');
      }
      // For now, return all activities (friends logic can be added later)
      query.visibility = { $in: ['public', 'friends'] };
    } else {
      // Default: return only public activities
      query.visibility = 'public';
    }

    return this.activityModel
      .find(query)
      .populate('creator', 'name email profileImageUrl')
      .sort({ createdAt: -1 })
      .exec();
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
    
    const activity = await this.activityModel
      .findById(activityId)
      .populate('participantIds', 'name profileImageUrl')
      .populate('creator', 'name profileImageUrl')
      .exec();

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const creatorId = activity.creator?.toString();
    if (!creatorId) {
      throw new NotFoundException('Activity creator not found');
    }

    // Filtrer les participants null/undefined et vérifier qu'ils ont un _id
    const validParticipants = activity.participantIds.filter(
      (participant: any) => participant && participant._id,
    );

    const participants = validParticipants.map((participant: any) => ({
      _id: participant._id,
      name: participant.name,
      profileImageUrl: participant.profileImageUrl,
      isHost: participant._id.toString() === creatorId,
      joinedAt: (activity as any).createdAt || new Date(), // Utiliser createdAt comme approximation
    }));

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
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier si l'utilisateur est le créateur
    if (activity.creator.toString() !== userId) {
      throw new ForbiddenException('Only the host can mark activity as complete');
    }

    // Marquer l'activité comme complétée
    activity.isCompleted = true;
    await activity.save();

    // Create activity log for all participants
    const participants = activity.participantIds || [];
    const activityDate = activity.date || activity.time || new Date();
    const defaultDuration = durationMinutes || 30; // Durée par défaut de 30 minutes si non fournie
    const defaultDistance = distanceKm || 0;

    // Log activity for each participant
    for (const participantId of participants) {
      const participantIdStr = participantId.toString();
      const participantIsHost = participantIdStr === activity.creator.toString();

      // Calculer l'XP selon la formule détaillée
      const xpEarned = this.xpService.calculateActivityXp(
        activity.sportType,
        defaultDuration,
        defaultDistance > 0 ? defaultDistance : undefined,
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
      await this.xpService.addXp(participantIdStr, xpEarned, 'complete_activity');

      // Update streak
      await this.streakService.updateStreak(participantIdStr, activityDate);

      // Check badges (peut débloquer des badges et donner de l'XP bonus)
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
      await this.challengeService.activateChallengesForUser(participantIdStr);

      // Update challenges (avec les informations détaillées)
      // Important: Pour les challenges quotidiens, on utilise la date de complétion (aujourd'hui)
      // pas la date de création de l'activité
      const completionDate = new Date(); // Date actuelle = date de complétion
      this.logger.log(
        `[ActivitiesService] Updating challenge progress for participant ${participantIdStr} after activity completion`,
      );
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
    }

    return { message: 'Activity marked as complete' };
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

