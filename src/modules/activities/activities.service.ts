import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

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
    return createdActivity.save();
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

  async getParticipants(activityId: string) {
    const activity = await this.activityModel
      .findById(activityId)
      .populate('participantIds', 'name profileImageUrl')
      .populate('creator', 'name profileImageUrl')
      .exec();

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const creatorId = activity.creator.toString();
    const participants = activity.participantIds.map((participant: any) => ({
      _id: participant._id,
      name: participant.name,
      profileImageUrl: participant.profileImageUrl,
      isHost: participant._id.toString() === creatorId,
      joinedAt: (activity as any).createdAt || new Date(), // Utiliser createdAt comme approximation
    }));

    return { participants };
  }

  async leaveActivity(activityId: string, userId: string) {
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

  async completeActivity(activityId: string, userId: string) {
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

    return { message: 'Activity marked as complete' };
  }

  async isUserParticipant(activityId: string, userId: string): Promise<boolean> {
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

  async getActivityParticipants(activityId: string): Promise<any[]> {
    const activity = await this.activityModel
      .findById(activityId)
      .populate('participantIds', 'name email profileImageUrl')
      .populate('creator', 'name email profileImageUrl')
      .exec();
    
    if (!activity) {
      return [];
    }

    // Inclure le créateur dans les participants
    const allParticipants = [
      activity.creator,
      ...activity.participantIds,
    ];

    // Éliminer les doublons
    const uniqueParticipantsMap = new Map();
    allParticipants.forEach((p: any) => {
      const id = p._id.toString();
      if (!uniqueParticipantsMap.has(id)) {
        uniqueParticipantsMap.set(id, p);
      }
    });

    return Array.from(uniqueParticipantsMap.values());
  }
}

