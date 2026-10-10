import { Document, Schema, model } from 'mongoose';
import {
  IUserSettings,
  BillingPlan,
  SubscriptionStatus,
  OAuthProvider,
  DEFAULT_USER_SETTINGS,
  BILLING_PLANS,
  OAUTH_PROVIDERS,
  STT_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  TONES,
} from '@voca/shared';

/** One signed-in device: sha256 of its current refresh token. */
export interface IRefreshSession {
  hash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUserDocument extends Document {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  providerId: string;
  /** Legacy single-session hash; migrated into refreshTokens on the next refresh. */
  refreshToken?: string;
  refreshTokens: IRefreshSession[];
  settings: IUserSettings;
  credits: number;
  plan: BillingPlan | null;
  currentPeriodEnd: Date | null;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  cancelScheduled: boolean;
  lastPaddleEventAt: Date | null;
  usageDay?: string;    // UTC YYYY-MM-DD that usageSeconds counts
  usageSeconds: number; // audio sent to STT on usageDay
  createdAt: Date;
}

const d = DEFAULT_USER_SETTINGS;

const translationSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: d.translation.enabled },
    targetLanguage: { type: String, default: d.translation.targetLanguage },
    tone: { type: String, enum: TONES, default: d.translation.tone },
    numeric: { type: Boolean, default: d.translation.numeric },
    planning: { type: Boolean, default: d.translation.planning },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    provider: { type: String, enum: STT_PROVIDERS, default: d.provider },
    language: { type: String, default: d.language },
    programLanguage: { type: String },
    programLanguageDefault: { type: String },
    noiseSuppression: { type: Boolean, default: d.noiseSuppression },
    echoCancellation: { type: Boolean, default: d.echoCancellation },
    privacyMode: { type: Boolean, default: d.privacyMode },
    translation: { type: translationSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    hash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    provider: { type: String, enum: OAUTH_PROVIDERS, required: true },
    providerId: { type: String, required: true },
    refreshToken: { type: String, select: false },
    refreshTokens: { type: [refreshSessionSchema], default: [], select: false },
    settings: { type: settingsSchema, default: () => ({}) },
    // No min: a deduction after a paid transcription may dip below zero, and save() validates every loaded path.
    credits: { type: Number, default: 0 },
    plan: { type: String, enum: BILLING_PLANS, default: null },
    currentPeriodEnd: { type: Date, default: null },
    paddleCustomerId: { type: String, default: null },
    paddleSubscriptionId: { type: String, default: null },
    subscriptionStatus: { type: String, enum: SUBSCRIPTION_STATUSES, default: null },
    cancelScheduled: { type: Boolean, default: false },
    lastPaddleEventAt: { type: Date, default: null },
    usageDay: { type: String },
    usageSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserModel = model<IUserDocument>('User', userSchema);
