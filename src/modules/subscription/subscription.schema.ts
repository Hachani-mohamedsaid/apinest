import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionType {
  FREE = 'free',                    // Coach vérifié : 1 activité gratuite
  PREMIUM_NORMAL = 'premium_normal', // 5 activités/mois
  PREMIUM_GOLD = 'premium_gold',     // 10 activités/mois + avantages
  PREMIUM_PLATINUM = 'premium_platinum' // Illimité + tous avantages
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
  INACTIVE = 'inactive'
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: SubscriptionType, 
    default: SubscriptionType.FREE,
    required: true 
  })
  type: SubscriptionType;

  @Prop({ 
    type: String, 
    enum: SubscriptionStatus, 
    default: SubscriptionStatus.INACTIVE 
  })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true, default: Date.now })
  startDate: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Date })
  nextBillingDate?: Date;

  @Prop({ type: String })
  stripeSubscriptionId?: string;

  @Prop({ type: String })
  stripeCustomerId?: string;

  @Prop({ type: String })
  stripePaymentMethodId?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  activitiesUsedThisMonth: number;

  @Prop({ type: Date, default: Date.now })
  lastResetDate: Date;

  @Prop({ type: Boolean, default: false })
  isCoachVerified: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  freeActivitiesRemaining: number; // Pour coach vérifié (1 pour FREE)

  @Prop({ type: Number, default: 0 })
  monthlyPrice: number; // Prix mensuel en EUR

  @Prop({ type: String, default: 'EUR' })
  currency: string; // EUR, USD, etc.
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Index pour les requêtes fréquentes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, type: 1 });
SubscriptionSchema.index({ status: 1, type: 1 });

