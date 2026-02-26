import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().positive().default(3100),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  DEEPGRAM_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  JWT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  PADDLE_API_KEY: z.string().default(''),
  PADDLE_CLIENT_TOKEN: z.string().default(''),
  PADDLE_WEBHOOK_SECRET: z.string().default(''),
  PADDLE_PRICE_PRO: z.string().default(''),
  PADDLE_PRICE_MAX: z.string().default(''),
  PADDLE_SANDBOX: z.coerce.boolean().default(true),
});

export const env = envSchema.parse(process.env);
