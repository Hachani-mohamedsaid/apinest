import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserStreakDocument = UserStreak & Document;

@Schema({ timestamps: true })
export class UserStreak {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop()
  lastActivityDate?: Date;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  bestStreak: number;
}

export const UserStreakSchema = SchemaFactory.createForClass(UserStreak);
UserStreakSchema.index({ userId: 1 }, { unique: true });

