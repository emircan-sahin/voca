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
  noiseSuppression: z.boolean(),
  privacyMode: z.boolean(),
  translation: z.object({
    enabled: z.boolean(),
    targetLanguage: z.enum(LANGUAGE_CODES),
    tone: z.enum(TONES),
    numeric: z.boolean(),
    planning: z.boolean(),
  }),
});

/** Partial version for PUT /auth/settings — allows old clients to send
 *  only the fields they know about without failing validation. */
export const updateUserSettingsSchema = z.object({
  provider: z.enum(STT_PROVIDERS).optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
  noiseSuppression: z.boolean().optional(),
  privacyMode: z.boolean().optional(),
  translation: z.object({
    enabled: z.boolean().optional(),
    targetLanguage: z.enum(LANGUAGE_CODES).optional(),
    tone: z.enum(TONES).optional(),
    numeric: z.boolean().optional(),
    planning: z.boolean().optional(),
  }).optional(),
});
