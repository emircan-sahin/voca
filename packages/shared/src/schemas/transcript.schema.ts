import { z } from 'zod';

const tokenUsageSchema = z.object({
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
});

export const transcriptSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  duration: z.number().nonnegative(),
  language: z.string().min(1),
  createdAt: z.string().datetime(),
  translatedText: z.string().optional(),
  targetLanguage: z.string().optional(),
  tokenUsage: tokenUsageSchema.optional(),
});

export type TranscriptDto = z.infer<typeof transcriptSchema>;
