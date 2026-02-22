import { z } from 'zod';

export const transcriptSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  duration: z.number().nonnegative(),
  language: z.string().min(1),
  createdAt: z.number().int().positive(),
});

export const createTranscriptSchema = z.object({
  audio: z.any(),
});

export type TranscriptDto = z.infer<typeof transcriptSchema>;
