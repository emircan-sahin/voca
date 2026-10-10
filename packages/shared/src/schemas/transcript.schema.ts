import { z } from 'zod';
import { LANGUAGE_CODES } from '../constants/languages';

const tokenUsageSchema = z.object({
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
});

export const VOCABULARY_MAX_ENTRIES = 50;
export const VOCABULARY_MAX_LENGTH = 40;

export const vocabularyEntrySchema = z
  .string()
  .trim()
  .min(1)
  .max(VOCABULARY_MAX_LENGTH)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u);

export const vocabularySchema = z.array(vocabularyEntrySchema).max(VOCABULARY_MAX_ENTRIES);

export const TRANSCRIPT_PAGE_SIZE = 50;
export const TRANSCRIPT_PAGE_MAX = 100;

// GET /transcripts: `before` is the last id of the previous page (ids are time-ordered ObjectIds)
export const transcriptListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(TRANSCRIPT_PAGE_MAX).optional(),
  before: z.string().regex(/^[0-9a-f]{24}$/i, 'before must be a transcript id').optional(),
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
  translationFailed: z.boolean().optional(),
});

