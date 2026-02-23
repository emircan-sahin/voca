import { z } from 'zod';
import { LANGUAGE_CODES } from '../constants/languages';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  provider: z.enum(['google', 'apple']),
  credits: z.number().min(0),
  plan: z.enum(['pro', 'max']).nullable(),
  planExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const activatePlanSchema = z.object({
  plan: z.enum(['pro', 'max']),
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
  provider: z.enum(['groq', 'deepgram']),
  language: z.enum(LANGUAGE_CODES),
  translation: z.object({
    enabled: z.boolean(),
    targetLanguage: z.enum(LANGUAGE_CODES),
    tone: z.enum(['developer', 'personal']),
    numeric: z.boolean(),
    planning: z.boolean(),
  }),
});
