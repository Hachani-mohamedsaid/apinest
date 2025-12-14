import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeaderboardCouponEmailDocument = LeaderboardCouponEmail & Document;

@Schema({ timestamps: true })
export class LeaderboardCouponEmail {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  couponCode: string; // Toujours "LEADERBOARD"

  @Prop({ required: true })
  sentAt: Date;

  @Prop({ required: true })
  weekStart: Date; // Début de la semaine pour laquelle le coupon a été envoyé

  @Prop({ default: false })
  couponUsed: boolean; // Si le coupon a été utilisé

  @Prop()
  usedAt?: Date; // Date d'utilisation du coupon
}

export const LeaderboardCouponEmailSchema = SchemaFactory.createForClass(LeaderboardCouponEmail);

// Index pour éviter les doublons
LeaderboardCouponEmailSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

