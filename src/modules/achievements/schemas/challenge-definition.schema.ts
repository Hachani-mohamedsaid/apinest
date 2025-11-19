import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChallengeDefinitionDocument = ChallengeDefinition & Document;

export enum ChallengeType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  LIMITED_TIME = 'limited_time',
}

@Schema({ timestamps: true })
export class ChallengeDefinition {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ChallengeType })
  challengeType: ChallengeType;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  xpReward: number;

  @Prop({ type: Types.ObjectId, ref: 'BadgeDefinition', default: null })
  badgeRewardId?: Types.ObjectId;

  @Prop({ required: true })
  targetCount: number;

  @Prop({ type: Object, required: true })
  unlockCriteria: Record<string, any>; // Flexible JSON

  @Prop({ default: true })
  isActive: boolean;
}

export const ChallengeDefinitionSchema = SchemaFactory.createForClass(ChallengeDefinition);
ChallengeDefinitionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
ChallengeDefinitionSchema.index({ challengeType: 1 });

