import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WithdrawDocument = Withdraw & Document;

@Schema({ timestamps: true })
export class Withdraw {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  coachId: Types.ObjectId; // ID du coach qui demande le retrait

  @Prop({ required: true })
  amount: number; // Montant en dollars (ex: 350.00)

  @Prop({ required: true, default: 'usd' })
  currency: string; // "usd", "eur", etc.

  @Prop({ default: 'bank_transfer' })
  paymentMethod: string; // "bank_transfer", "paypal", etc.

  @Prop()
  bankAccount: string; // Numéro de compte bancaire (optionnel)

  @Prop({ required: true, default: 'pending' })
  status: string; // "pending", "processing", "completed", "failed", "cancelled"

  @Prop({ unique: true })
  withdrawId: string; // ID unique du retrait (généré)

  @Prop()
  processedAt: Date; // Date de traitement

  @Prop()
  completedAt: Date; // Date de complétion

  @Prop()
  failureReason: string; // Raison de l'échec si status = "failed"

  @Prop()
  transactionId: string; // ID de transaction externe (Stripe, PayPal, etc.)
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);

// Index pour les requêtes
WithdrawSchema.index({ coachId: 1, createdAt: -1 });
WithdrawSchema.index({ status: 1 });
WithdrawSchema.index({ withdrawId: 1 }, { unique: true });

