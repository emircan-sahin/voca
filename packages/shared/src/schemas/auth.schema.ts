import { z } from 'zod';
import { LANGUAGE_CODES, TONES } from '../constants/languages';
import { BILLING_PLANS, OAUTH_PROVIDERS, STT_PROVIDERS } from '../types/auth.types';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  provider: z.enum(OAUTH_PROVIDERS),
  credits: z.number().min(0),
  plan: z.enum(BILLING_PLANS).nullable(),
  planExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const activatePlanSchema = z.object({
  plan: z.enum(BILLING_PLANS),
});

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const userSettingsSchema = z.object({
  provider: z.enum(STT_PROVIDERS),
  language: z.enum(LANGUAGE_CODES),
  translation: z.object({
    enabled: z.boolean(),
    targetLanguage: z.enum(LANGUAGE_CODES),
    tone: z.enum(TONES),
    numeric: z.boolean(),
    planning: z.boolean(),
  }),
});
