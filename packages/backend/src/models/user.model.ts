import { Document, Schema, model } from 'mongoose';
import { IUserSettings } from '@voca/shared';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  providerId: string;
  refreshToken?: string;
  settings: IUserSettings;
  createdAt: Date;
}

const translationSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    targetLanguage: { type: String, default: 'en' },
    tone: { type: String, enum: ['developer', 'personal'], default: 'developer' },
    numeric: { type: Boolean, default: false },
    planning: { type: Boolean, default: false },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    provider: { type: String, enum: ['groq', 'deepgram'], default: 'deepgram' },
    language: { type: String, default: 'en' },
    translation: { type: translationSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    provider: { type: String, enum: ['google', 'apple'], required: true },
    providerId: { type: String, required: true },
    refreshToken: { type: String },
    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserModel = model<IUserDocument>('User', userSchema);
