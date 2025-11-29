import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Activity' })
  activityId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, default: null })
  comment?: string | null;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Index pour éviter les doublons (un utilisateur ne peut laisser qu'un review par activité)
ReviewSchema.index({ activityId: 1, userId: 1 }, { unique: true });

