import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LevelDocument = Level & Document;

@Schema({ timestamps: true })
export class Level {
  @Prop({ required: true, unique: true, min: 1, max: 100 })
  levelNumber: number;

  @Prop({ required: true })
  xpRequired: number; // Total XP to reach this level

  @Prop({ required: true })
  xpForNextLevel: number; // XP needed from this level to next

  @Prop({ type: Object, default: {} })
  rewards?: Record<string, any>;
}

export const LevelSchema = SchemaFactory.createForClass(Level);
LevelSchema.index({ levelNumber: 1 });

