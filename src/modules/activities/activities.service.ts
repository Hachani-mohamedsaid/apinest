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
}

