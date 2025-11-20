import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  activityType: string; // e.g., 'Running', 'Swimming', 'Yoga'

  @Prop({ required: true })
  activityName: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, default: 0 })
  xpEarned: number;

  @Prop({ default: false })
  isHost: boolean;

  @Prop({ default: 1 })
  participantsCount: number;

  // Champs additionnels pour le calcul détaillé d'XP
  @Prop({ default: 0 })
  durationMinutes: number; // Durée de l'activité en minutes

  @Prop({ default: 0 })
  distanceKm: number; // Distance parcourue en kilomètres (optionnel)

  @Prop()
  caloriesBurned?: number; // Calories brûlées (optionnel)

  @Prop()
  averageHeartRate?: number; // Fréquence cardiaque moyenne (optionnel)
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ userId: 1, date: 1 });
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ userId: 1, date: -1 });

