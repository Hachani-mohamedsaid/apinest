import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeaderboardCacheDocument = LeaderboardCache & Document;

@Schema({ timestamps: true })
export class LeaderboardCache {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true, default: 0 })
  totalXp: number;

  @Prop({ required: true })
  rank: number;
}

export const LeaderboardCacheSchema = SchemaFactory.createForClass(LeaderboardCache);
LeaderboardCacheSchema.index({ rank: 1 });
LeaderboardCacheSchema.index({ totalXp: -1 });
LeaderboardCacheSchema.index({ userId: 1 }, { unique: true });

