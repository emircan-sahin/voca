import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().positive().default(3100),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  DEEPGRAM_API_KEY: z.string().default(''),
  XAI_API_KEY: z.string().default(''),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  PADDLE_API_KEY: z.string().default(''),
  PADDLE_CLIENT_TOKEN: z.string().default(''),
  PADDLE_WEBHOOK_SECRET: z.string().default(''),
  PADDLE_PRICE_PRO: z.string().default(''),
  PADDLE_PRICE_MAX: z.string().default(''),
  // Not z.coerce.boolean(): Boolean('false') is true, so production would silently hit the sandbox.
  PADDLE_SANDBOX: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  // Reverse-proxy hops in front of the app, or 'cloudflare' to read the visitor IP from CF-Connecting-IP.
  // Without it req.ip is the proxy and every user shares one rate-limit bucket.
  TRUST_PROXY: z.union([z.literal('cloudflare'), z.coerce.number().int().min(0)]).default(0),
  // Per-user cap on audio sent to STT per UTC day; the only cost limit while paid plans are disabled.
  DAILY_AUDIO_LIMIT_MINUTES: z.coerce.number().positive().default(180),
  AXIOM_TOKEN: z.string().default(''),
  AXIOM_DATASET: z.string().default(''),
  BASE_URL: z.string().url('BASE_URL is required (e.g. http://localhost:3100/api)'),
});

export const env = envSchema.parse(process.env);
