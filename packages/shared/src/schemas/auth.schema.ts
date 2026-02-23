import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  provider: z.enum(['google', 'apple']),
  createdAt: z.string().datetime(),
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
  language: z.string().min(1),
  translation: z.object({
    enabled: z.boolean(),
    targetLanguage: z.string().min(1),
    tone: z.enum(['developer', 'personal']),
    numeric: z.boolean(),
    planning: z.boolean(),
  }),
});
