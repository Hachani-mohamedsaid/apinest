import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityMessageDocument = ActivityMessage & Document;

@Schema({ timestamps: true })
export class ActivityMessage {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Activity' })
  activity: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  sender: Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const ActivityMessageSchema = SchemaFactory.createForClass(ActivityMessage);

