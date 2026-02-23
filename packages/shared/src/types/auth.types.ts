export type BillingPlan = 'pro' | 'max';

export const PLAN_CREDITS: Record<BillingPlan, number> = {
  pro: 3,
  max: 10,
};

export const PLAN_RANK: Record<BillingPlan, number> = { pro: 1, max: 2 };

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
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
  provider: 'groq' | 'deepgram';
  language: string;
  translation: {
    enabled: boolean;
    targetLanguage: string;
    tone: 'developer' | 'personal';
    numeric: boolean;
    planning: boolean;
  };
}
