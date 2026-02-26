import { Document, Schema, model } from 'mongoose';
import { IUserSettings, BillingPlan, SubscriptionStatus, DEFAULT_USER_SETTINGS } from '@voca/shared';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  providerId: string;
  refreshToken?: string;
  settings: IUserSettings;
  credits: number;
  plan: BillingPlan | null;
  currentPeriodEnd: Date | null;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  cancelScheduled: boolean;
  createdAt: Date;
}

const d = DEFAULT_USER_SETTINGS;

const translationSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: d.translation.enabled },
    targetLanguage: { type: String, default: d.translation.targetLanguage },
    tone: { type: String, enum: ['developer', 'personal'], default: d.translation.tone },
    numeric: { type: Boolean, default: d.translation.numeric },
    planning: { type: Boolean, default: d.translation.planning },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    provider: { type: String, enum: ['groq', 'deepgram'], default: d.provider },
    language: { type: String, default: d.language },
    programLanguage: { type: String },
    programLanguageDefault: { type: String },
    noiseSuppression: { type: Boolean, default: d.noiseSuppression },
    privacyMode: { type: Boolean, default: d.privacyMode },
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
    credits: { type: Number, default: 0, min: 0 },
    plan: { type: String, enum: ['pro', 'max'], default: null },
    currentPeriodEnd: { type: Date, default: null },
    paddleCustomerId: { type: String, default: null },
    paddleSubscriptionId: { type: String, default: null },
    subscriptionStatus: { type: String, enum: ['trialing', 'active', 'canceled'], default: null },
    cancelScheduled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserModel = model<IUserDocument>('User', userSchema);
