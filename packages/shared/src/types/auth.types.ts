import { LANGUAGE_CODES, TranslationTone } from '../constants/languages';

export const APP_LOCALES = ['en', 'es', 'hi', 'zh', 'de', 'pt', 'ja', 'fr', 'tr', 'ru', 'ko', 'it'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const BILLING_PLANS = ['pro', 'max'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const PLAN_CREDITS: Record<BillingPlan, number> = {
  pro: 3,
  max: 10,
};

export const TRIAL_CREDITS: Record<BillingPlan, number> = {
  pro: 0.5,
  max: 1.5,
};

export const PLAN_RANK: Record<BillingPlan, number> = { pro: 1, max: 2 };

/** Max audio upload size in bytes per plan */
export const PLAN_UPLOAD_LIMIT: Record<BillingPlan, number> = {
  pro: 10 * 1024 * 1024,  // 10 MB
  max: 25 * 1024 * 1024,  // 25 MB
};

export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const OAUTH_PROVIDERS = ['google', 'apple'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const STT_PROVIDERS = ['groq', 'deepgram'] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  credits: number;
  plan: BillingPlan | null;
  currentPeriodEnd: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  cancelScheduled: boolean;
  createdAt: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
  refreshToken: string;
}

export interface IUserSettings {
  provider: SttProvider;
  language: LanguageCode;
  programLanguage?: AppLocale;
  programLanguageDefault?: AppLocale;
  noiseSuppression: boolean;
  privacyMode: boolean;
  translation: {
    enabled: boolean;
    targetLanguage: LanguageCode;
    tone: TranslationTone;
    numeric: boolean;
    planning: boolean;
  };
}

export const DEFAULT_USER_SETTINGS: IUserSettings = {
  provider: 'deepgram',
  language: 'en',
  programLanguage: 'en',
  noiseSuppression: false,
  privacyMode: false,
  translation: {
    enabled: false,
    targetLanguage: 'en',
    tone: 'developer',
    numeric: false,
    planning: false,
  },
};
