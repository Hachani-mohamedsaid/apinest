import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  BADGE_UNLOCKED = 'badge_unlocked',
  LEVEL_UP = 'level_up',
  CHALLENGE_COMPLETED = 'challenge_completed',
  XP_EARNED = 'xp_earned',
  STREAK_UPDATED = 'streak_updated',
  LIKE_RECEIVED = 'like_received',
  MATCH_MADE = 'match_made',
  ACTIVITY_REVIEW_REQUEST = 'activity_review_request',
  // Subscription notifications
  SUBSCRIPTION_LIMIT_WARNING = 'subscription_limit_warning',
  SUBSCRIPTION_RENEWAL_REMINDER = 'subscription_renewal_reminder',
  SUBSCRIPTION_PAYMENT_SUCCESS = 'subscription_payment_success',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Pour stocker des données supplémentaires (badgeId, xpAmount, etc.)

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, type: 1 });

