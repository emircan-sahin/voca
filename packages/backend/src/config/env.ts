import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3100'),
  MONGODB_URI: z.string(),
  GROQ_API_KEY: z.string(),
  DEEPGRAM_API_KEY: z.string().default(''),
});

export const env = envSchema.parse(process.env);
