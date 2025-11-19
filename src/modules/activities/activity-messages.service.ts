import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityMessage, ActivityMessageDocument } from './schemas/activity-message.schema';
import { Activity, ActivityDocument } from './schemas/activity.schema';

@Injectable()
export class ActivityMessagesService {
  constructor(
    @InjectModel(ActivityMessage.name)
    private activityMessageModel: Model<ActivityMessageDocument>,
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
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

  async getMessages(activityId: string) {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const messages = await this.activityMessageModel
      .find({ activity: activityId })
      .populate('sender', 'name profileImageUrl')
      .sort({ createdAt: 1 })
      .exec();

    return { messages };
  }

  async sendMessage(activityId: string, userId: string, content: string) {
    this.validateObjectId(activityId);
    
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Vérifier que l'utilisateur est participant ou créateur
    const isCreator = activity.creator.toString() === userId;
    const isParticipant = activity.participantIds.some(
      (p: any) => p.toString() === userId,
    );

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('You must join the activity to send messages');
    }

    const message = new this.activityMessageModel({
      activity: activityId,
      sender: userId,
      content,
    });

    await message.save();
    await message.populate('sender', 'name profileImageUrl');

    return message;
  }
}

