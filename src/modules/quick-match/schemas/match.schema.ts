import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MatchDocument = Match & Document;

@Schema({ timestamps: true })
export class Match {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user1: Types.ObjectId; // Premier utilisateur du match

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user2: Types.ObjectId; // Deuxième utilisateur du match

  @Prop({ default: false })
  hasChatted: boolean; // true si les utilisateurs ont démarré une conversation

  @Prop({ type: Types.ObjectId, ref: 'Chat' })
  chatId?: Types.ObjectId; // ID du chat créé pour ce match

  createdAt?: Date;
  updatedAt?: Date;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

// Index pour éviter les doublons (user1-user2 et user2-user1 sont considérés comme le même match)
MatchSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Index pour les requêtes de matching
MatchSchema.index({ user1: 1 });
MatchSchema.index({ user2: 1 });

