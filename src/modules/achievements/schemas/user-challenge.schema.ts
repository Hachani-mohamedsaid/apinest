import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserChallengeDocument = UserChallenge & Document;

export enum ChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class UserChallenge {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'ChallengeDefinition' })
  challengeId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  currentProgress: number;

  @Prop({ required: true })
  targetCount: number;

  @Prop({ required: true, enum: ChallengeStatus, default: ChallengeStatus.ACTIVE })
  status: ChallengeStatus;

  @Prop({ required: true, default: Date.now })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const UserChallengeSchema = SchemaFactory.createForClass(UserChallenge);
UserChallengeSchema.index({ userId: 1, status: 1 });
UserChallengeSchema.index({ expiresAt: 1 });
UserChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

