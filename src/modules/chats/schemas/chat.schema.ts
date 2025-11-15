import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true, type: [Types.ObjectId], ref: 'User' })
  participants: Types.ObjectId[];

  @Prop({ required: true, default: false })
  isGroup: boolean;

  @Prop()
  groupName?: string;

  @Prop()
  groupAvatar?: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>; // userId -> unread count

  @Prop({ type: Map, of: Date, default: {} })
  lastReadAt: Map<string, Date>; // userId -> last read timestamp

  @Prop({ type: Types.ObjectId, ref: 'Activity' })
  activityId?: Types.ObjectId; // Lier le chat à une activité
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

// Index for faster queries
ChatSchema.index({ participants: 1 });
ChatSchema.index({ lastMessage: 1 });
ChatSchema.index({ activityId: 1 }); // Index pour les requêtes par activité

