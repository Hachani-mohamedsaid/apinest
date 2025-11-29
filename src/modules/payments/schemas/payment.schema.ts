import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Activity' })
  activityId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  coachId: Types.ObjectId; // ID du créateur de l'activité

  @Prop({ required: true })
  amount: number; // Montant en cents (depuis Stripe)

  @Prop({ required: true, default: 'eur' })
  currency: string; // "eur", "usd", etc.

  @Prop({ required: true })
  paymentIntentId: string; // ID Stripe Payment Intent

  @Prop({ required: true, default: 'succeeded' })
  status: string; // "succeeded", "failed", "pending", etc.
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Index pour les requêtes
PaymentSchema.index({ coachId: 1, createdAt: -1 });
PaymentSchema.index({ activityId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ paymentIntentId: 1 }, { unique: true }); // Un paiement par Payment Intent

