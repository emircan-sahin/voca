import { z } from 'zod';
import { LANGUAGE_CODES } from '../constants/languages';

const tokenUsageSchema = z.object({
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
});

export const transcriptSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  duration: z.number().nonnegative(),
  language: z.enum(LANGUAGE_CODES),
  createdAt: z.string().datetime(),
  translatedText: z.string().optional(),
  targetLanguage: z.enum(LANGUAGE_CODES).optional(),
  tokenUsage: tokenUsageSchema.optional(),
});

