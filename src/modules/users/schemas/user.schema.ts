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
}

export const UserSchema = SchemaFactory.createForClass(User);

