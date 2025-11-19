import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BadgeDefinitionDocument = BadgeDefinition & Document;

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum BadgeCategory {
  ACTIVITY = 'activity',
  SOCIAL = 'social',
  STREAK = 'streak',
  MILESTONE = 'milestone',
}

@Schema({ timestamps: true })
export class BadgeDefinition {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  iconUrl: string; // Emoji or URL

  @Prop({ required: true, enum: BadgeRarity })
  rarity: BadgeRarity;

  @Prop({ required: true, enum: BadgeCategory })
  category: BadgeCategory;

  @Prop({ type: Object, required: true })
  unlockCriteria: Record<string, any>; // Flexible JSON

  @Prop({ required: true, default: 75 })
  xpReward: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BadgeDefinitionSchema = SchemaFactory.createForClass(BadgeDefinition);
BadgeDefinitionSchema.index({ isActive: 1 });
BadgeDefinitionSchema.index({ category: 1 });

