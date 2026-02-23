import { LANGUAGE_CODES, TranslationTone } from '../constants/languages';

export const BILLING_PLANS = ['pro', 'max'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const PLAN_CREDITS: Record<BillingPlan, number> = {
  pro: 3,
  max: 10,
};

export const PLAN_RANK: Record<BillingPlan, number> = { pro: 1, max: 2 };

/** Max audio upload size in bytes per plan */
export const PLAN_UPLOAD_LIMIT: Record<BillingPlan, number> = {
  pro: 10 * 1024 * 1024,  // 10 MB
  max: 25 * 1024 * 1024,  // 25 MB
};

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
  planExpiresAt: string | null;
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
  translation: {
    enabled: boolean;
    targetLanguage: LanguageCode;
    tone: TranslationTone;
    numeric: boolean;
    planning: boolean;
  };
}
