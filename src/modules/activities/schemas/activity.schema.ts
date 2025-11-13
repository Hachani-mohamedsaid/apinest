import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  creator: Types.ObjectId;

  @Prop({ required: true, enum: ['Football', 'Basketball', 'Running', 'Cycling'] })
  sportType: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  time: Date;

  @Prop({ required: true, min: 1, max: 100, default: 5 })
  participants: number;

  @Prop({ required: true, enum: ['Beginner', 'Intermediate', 'Advanced'] })
  level: string;

  @Prop({ required: true, enum: ['public', 'friends'], default: 'public' })
  visibility: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

