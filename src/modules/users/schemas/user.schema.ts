import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop({ default: false })
  isEmailVerified?: boolean;

  @Prop()
  phone?: string;

  @Prop()
  dateOfBirth?: string;

  @Prop()
  about?: string;

  @Prop({ type: [String], default: [] })
  sportsInterests?: string[];

  @Prop()
  profileImageUrl?: string;

  @Prop()
  profileImageDeleteUrl?: string;

  @Prop()
  profileImageThumbnailUrl?: string;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  // Achievements System Fields
  @Prop({ default: 0 })
  totalXp?: number;

  @Prop({ default: 1 })
  currentLevel?: number;

  @Prop({ default: 0 })
  currentStreak?: number;

  @Prop({ default: 0 })
  bestStreak?: number;

  // Coach Verification Fields
  @Prop({ default: false })
  isCoachVerified?: boolean;

  @Prop({
    type: {
      coachName: String,
      confidenceScore: Number,
      verificationReasons: [String],
      verifiedAt: Date,
    },
    default: null,
  })
  coachVerificationData?: {
    coachName?: string;
    confidenceScore?: number;
    verificationReasons?: string[];
    verifiedAt?: Date;
  };

  // Follow/Unfollow System Fields
  @Prop({ type: [{ type: String }], default: [] })
  followers?: string[]; // IDs des utilisateurs qui suivent cet utilisateur

  @Prop({ type: [{ type: String }], default: [] })
  following?: string[]; // IDs des utilisateurs que cet utilisateur suit

  // Statistiques calculées (optionnel, peut être calculé depuis followers.length)
  @Prop({ default: 0 })
  followersCount?: number;

  @Prop({ default: 0 })
  followingCount?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index pour améliorer les performances des requêtes
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });

