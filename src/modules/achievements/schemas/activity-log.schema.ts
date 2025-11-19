import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  activityType: string; // e.g., 'running', 'swimming', 'yoga'

  @Prop({ required: true })
  activityName: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, default: 0 })
  xpEarned: number;

  @Prop({ default: false })
  isHost: boolean;

  @Prop({ default: 1 })
  participantsCount: number;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ userId: 1, date: 1 });
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ userId: 1, date: -1 });

