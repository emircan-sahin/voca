# Backend Rules — @voca/backend

## Response Format
**Always** use `sendSuccess` / `sendError`:
```typescript
import { sendSuccess, sendError } from '~/utils/response';

// Success — use req.t() for localized messages
return sendSuccess(res, req.t('general.ok'), data);

// Error — use req.t() for localized messages
return sendError(res, req.t('billing.invalidPlan'), 400);
```
Using `res.json()` or `res.send()` directly is **forbidden** (exception: OAuth callback HTML pages).

## i18n (Server-side)
- **Library**: `i18next` + `i18next-http-middleware`
- **Config**: `src/i18n/config.ts` — 12 locales (en, es, hi, zh, de, pt, ja, fr, tr, ru, ko, it)
- **Middleware**: Registered in `src/index.ts` — populates `req.t()` on every request
- **Usage**: All user-facing messages in controllers must use `req.t('key')` instead of hardcoded strings
- **Key patterns**: `general.ok`, `user.notFound`, `billing.invalidPlan`, `billing.trialNoChanges`

## Mongoose → Controller Mapping
Never return a Mongoose document directly. Use `toIX()` mapping helpers:
```typescript
// Extract a helper when mapping is used 2+ times
function toITranscript(doc: ITranscriptDocument): ITranscript {
  return {
    id: doc._id.toString(),
    text: doc.text,
    duration: doc.duration,
    language: doc.language,
    createdAt: doc.createdAt.toISOString(),
    ...(doc.translatedText && { translatedText: doc.translatedText }),
    ...(doc.targetLanguage && { targetLanguage: doc.targetLanguage }),
    ...(doc.tokenUsage && { tokenUsage: doc.tokenUsage }),
  };
}

// Usage
return sendSuccess(res, 'Success', toITranscript(doc));
return sendSuccess(res, 'Fetched', docs.map(toITranscript));
```
Existing helpers: `toIUser()` in `auth.service.ts`, `toITranscript()` in `transcript.controller.ts`.
**Never** expose internal fields like `__v`. Use `doc.createdAt.toISOString()` for dates.

## Authentication
- Google OAuth with `voca://` deep link callback (no polling)
- JWT access tokens (15m) + refresh tokens (7d) stored in `UserModel.refreshToken`
- `authenticate` middleware extracts user from Bearer token, attaches `req.user`
- `requireAuthConfig()` guard checks `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` (min 32 chars)

## Billing & Credits (Paddle v2)
- Plans: `pro` ($3, 300¢ credits, 10 MB upload) and `max` ($10, 1000¢ credits, 25 MB upload)
- Upload size enforced in multer middleware via `PLAN_UPLOAD_LIMIT` from `@voca/shared`
- `requireCredits` middleware gates `POST /api/transcripts`
- Credits deducted **before** transcript creation (STT cost + Gemini cost + 25% markup)
- Both plans include: AI-enhanced tone & translation, Numeric & Planning formatting add-ons

### Paddle Integration
- **SDK**: `@paddle/paddle-node-sdk` initialized in `src/config/paddle.ts`
- **Checkout**: `POST /api/billing/checkout` → returns Paddle transaction ID for inline overlay
- **Webhook**: `POST /api/billing/webhook` → raw body middleware, signature verification via `paddle.webhooks.unmarshal()`
- **Events**: `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.canceled`
- **Credit flow**: `handleSubscriptionEvent()` in `billing.service.ts` — trial → active resets credits, upgrade grants new plan credits, renewal resets credits
- **Deduction**: `deductCredits()` atomic `$inc` with `$gte` guard (prevents negative)
- **Cancel**: `POST /api/billing/cancel` → sets `cancelScheduled: true`, cancels via Paddle API
- **Config**: `GET /api/billing/config` → returns `clientToken`, `priceId` for frontend

### User Model Billing Fields
```typescript
credits: number                        // Remaining credits in cents
plan: BillingPlan | null               // 'pro' | 'max' | null
currentPeriodEnd: Date | null          // Subscription expiry
paddleCustomerId: string | null        // Paddle customer ID
paddleSubscriptionId: string | null    // Paddle subscription ID
subscriptionStatus: SubscriptionStatus // 'trialing' | 'active' | 'canceled' | null
cancelScheduled: boolean               // Pending cancellation flag
```

## Rate Limiting
Three tiers via `createLimiter()` factory in `src/middleware/rateLimit.middleware.ts`:
| Limiter | Scope | Limit |
|---------|-------|-------|
| `globalLimiter` | All endpoints | 60 req/min per IP |
| `authLimiter` | `/api/auth/*` | 10 req/min per IP |
| `transcriptLimiter` | `POST /api/transcripts` | 10 req/min per IP |

New limiters must use the factory:
```typescript
export const fooLimiter = createLimiter(10, 'Too many foo requests, please try again later');
```

## CORS
Configurable via `CORS_ORIGIN` env var (comma-separated origins). Default: `http://localhost:5173`.

## Transcription Providers
Two providers are supported. The controller selects based on the `provider` query param.

### Groq SDK
```typescript
import Groq from 'groq-sdk';
const transcription = await groq.audio.transcriptions.create({
  file: fs.createReadStream(filePath),
  model: 'whisper-large-v3-turbo',
  response_format: 'verbose_json',
});
```
Model: `whisper-large-v3-turbo` only. Cost: $0.111/hour.

### Deepgram SDK
```typescript
import { createClient } from '@deepgram/sdk';
const { result } = await deepgram.listen.prerecorded.transcribeFile(buffer, {
  model: 'nova-3',
  smart_format: true,
  language,
});
```
Model: `nova-3` only. Cost: $0.0077/min ($0.462/hour).

## Hallucination Detection
Both services return a `hallucination: boolean` flag. If true, the controller deletes the audio file and returns a 422 error.

Detection signals:
- **Groq**: segment end time > 3x actual duration, high `no_speech_prob` across all segments, known false patterns (e.g. Turkish subtitle artifacts)
- **Deepgram**: empty transcript text or confidence < 0.3

## Language Support
The controller validates `language` against `LANGUAGE_CODES` from `@voca/shared` (35 codes). Default: `en`. The same enum is used for `translateTo` query param and `userSettingsSchema`.

## Input Validation
- **Query params**: `transcribeQuerySchema` with `safeParse()` — invalid params return 400 and clean up uploaded file
- **Settings**: `userSettingsSchema` validates `language` and `targetLanguage` against `LANGUAGE_CODES` enum
- **File upload**: MIME type whitelist + magic bytes verification (WAV, MP3/ID3, OGG, WebM, MP4 headers)
- **Auth**: `refreshBodySchema` validates refresh token body

## Multer — Audio File Handling
- `upload.single('audio')` middleware wraps multer with post-upload magic bytes check
- Field name: `audio` (must match frontend)
- Max size: 25 MB (hard limit), Pro: 10 MB, Max: 25 MB (plan-based)
- Allowed MIME types: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`
- Allowed extensions: `.webm`, `.mp4`, `.mpeg`, `.mp3`, `.wav`, `.ogg`, `.m4a` (whitelist, defaults to `.webm`)
- Magic bytes verified after disk write — invalid content returns 400 and deletes file
- **Zero retention**: Audio files are deleted immediately after transcription (before DB write). `audioPath` is not stored in the transcript document. On server startup, the uploads directory is purged.

## Privacy Mode
- `IUserSettings.privacyMode` (boolean, default `false`) — synced like other settings
- **Toggle ON (false→true)**: `updateSettings` detects the transition and calls `deleteUserTranscripts(userId)` to wipe all existing transcripts
- **Active**: After each `createTranscript`, the controller checks privacy mode and calls `deleteUserTranscripts(userId, excludeId)` to keep only the latest transcript
- **Toggle OFF**: Normal behavior resumes, transcripts accumulate
- `deleteUserTranscripts(userId, excludeId?)` helper in `transcript.controller.ts` — simple `deleteMany`, no audio cleanup needed (files are already deleted)

## Settings Fields
```typescript
settings: {
  provider: SttProvider;             // 'groq' | 'deepgram'
  language: LanguageCode;            // STT language (35 codes)
  noiseSuppression: boolean;
  privacyMode: boolean;
  translation: { enabled, tone, targetLanguage, numeric, planning };
  programLanguage: AppLocale;        // UI language chosen by user (12 codes)
  programLanguageDefault: AppLocale; // Auto-detected on first launch, saved once
}
```

## Route Structure
```
src/routes/auth.routes.ts        → /api/auth
src/routes/transcript.routes.ts  → /api/transcripts
src/routes/billing.routes.ts     → /api/billing
```
For each new resource:
1. `src/routes/` → Router definition
2. `src/controllers/` → Business logic
3. `src/services/` → External service integration
4. `src/models/` → Mongoose model
5. Register the route in `src/index.ts`

## Middleware Chain (order matters)
```
cors → express.json → globalLimiter → logging → routes → 404 handler → errorMiddleware
```
Per-route: `authenticate → [rateLimiter] → [requireCredits] → [multer] → controller`

## Error Handling
- `errorMiddleware` handles: `ZodError` (400), `MulterError` (400), unsupported audio format (400), `CastError` (400), unknown (500)
- Async controllers can throw — errors fall through to `errorMiddleware`

## Import Rules
- `~/` alias is mandatory, relative imports (`../../`) are **forbidden**
- dayjs: `import dayjs from 'dayjs'` directly (no lib wrapper)
- Shared: `import { ITranscript, LANGUAGE_CODES } from '@voca/shared'`

## Env Validation
```typescript
// src/config/env.ts
const envSchema = z.object({
  PORT: z.coerce.number().positive().default(3100),
  MONGODB_URI: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  JWT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  // Paddle Billing
  PADDLE_API_KEY: z.string(),
  PADDLE_CLIENT_TOKEN: z.string(),
  PADDLE_WEBHOOK_SECRET: z.string(),
  PADDLE_PRICE_PRO: z.string(),
  PADDLE_PRICE_MAX: z.string(),
  PADDLE_SANDBOX: z.boolean().default(true),
});
export const env = envSchema.parse(process.env);
```
Using `process.env.X` directly is **forbidden** — always use `env.X`.

## AppConfig Singleton
`latestVersion` is stored in MongoDB via `AppConfigModel` (`src/models/appConfig.model.ts`), not as an env var.
- Singleton document: `{ _id: 'main', latestVersion: '0.0.1' }`
- `ensureAppConfig()` called at startup — upserts without overwriting existing values (`$setOnInsert`)
- `getAppConfig()` returns in-memory cached value (sync), refreshed every 3 minutes via `setInterval`
- Health endpoint: `GET /api/health` → `{ success: true, data: { latestVersion } }`

## Backend Code Quality

### File Cleanup
Use `safeUnlink()` from `~/utils/fs` — never `fs.unlink(path, () => {})`. Silent failures cause orphaned files.
```typescript
import { safeUnlink } from '~/utils/fs';
safeUnlink(filePath); // Logs warning on failure
```

### Error Extraction
Use `getErrorMessage()` from `~/utils/error` — never `(err as Error).message`.
```typescript
import { getErrorMessage } from '~/utils/error';
catch (err) {
  return sendError(res, getErrorMessage(err), 400);
}
```

### No Silent Catch
Always log errors with context:
```typescript
// Wrong
.catch(() => {});

// Right
.catch((err) => console.warn('[Context]', err.message ?? err));
```

### External API Results
Always validate external API responses before accessing nested properties:
```typescript
// Wrong
const text = result.results.channels[0].alternatives[0].transcript;

// Right
const alt = result?.results?.channels?.[0]?.alternatives?.[0];
if (!alt) throw new Error('Provider returned empty result');
const text = alt.transcript;
```
