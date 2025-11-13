import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PassDocument = Pass & Document;

@Schema({ timestamps: true })
export class Pass {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  fromUser: Types.ObjectId; // Utilisateur qui a passé

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  toUser: Types.ObjectId; // Utilisateur qui a été passé
}

export const PassSchema = SchemaFactory.createForClass(Pass);

// Index pour éviter les doublons
PassSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

// Index pour les requêtes de filtrage
PassSchema.index({ fromUser: 1 });

