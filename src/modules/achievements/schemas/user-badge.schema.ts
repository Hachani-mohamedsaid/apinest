import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserBadgeDocument = UserBadge & Document;

@Schema({ timestamps: true })
export class UserBadge {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'BadgeDefinition' })
  badgeId: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  earnedAt: Date;

  @Prop({ type: Object, default: {} })
  progress?: Record<string, any>; // Optional progress tracking
}

export const UserBadgeSchema = SchemaFactory.createForClass(UserBadge);
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ userId: 1 });

