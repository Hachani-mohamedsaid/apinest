import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  fromUser: Types.ObjectId; // Utilisateur qui a liké

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  toUser: Types.ObjectId; // Utilisateur qui a été liké

  @Prop({ default: false })
  isMatch: boolean; // true si c'est un match mutuel
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Index pour éviter les doublons
LikeSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

// Index pour les requêtes de matching
LikeSchema.index({ toUser: 1, fromUser: 1, isMatch: 1 });

