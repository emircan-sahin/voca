# Backend Rules — @voca/backend

## Response Format
**Always** use `sendSuccess` / `sendError`:
```typescript
import { sendSuccess, sendError } from '~/utils/response';

// Success
return sendSuccess(res, 'Operation successful', data);

// Error
return sendError(res, 'Error message', 400);
```
Using `res.json()` or `res.send()` directly is **forbidden** (exception: OAuth callback HTML pages).

## Mongoose → Controller Mapping
Never return a Mongoose document directly. `_id → id` mapping is mandatory:
```typescript
const transcript: ITranscript = {
  id: doc._id.toString(),
  text: doc.text,
  duration: doc.duration,
  language: doc.language,
  createdAt: doc.createdAt.toISOString(), // ISO 8601
};
return sendSuccess(res, 'Success', transcript);
```
**Never** expose internal fields like `audioPath`, `__v`. Use `doc.createdAt.toISOString()` for dates.

## Authentication
- Google OAuth with `voca://` deep link callback (no polling)
- JWT access tokens (15m) + refresh tokens (7d) stored in `UserModel.refreshToken`
- `authenticate` middleware extracts user from Bearer token, attaches `req.user`
- `requireAuthConfig()` guard checks `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` (min 32 chars)

## Billing & Credits
- Plans: `pro` ($3, 300¢ credits, 10 MB upload) and `max` ($10, 1000¢ credits, 25 MB upload), 30-day expiry
- Upload size enforced in multer middleware via `PLAN_UPLOAD_LIMIT` from `@voca/shared`
- `requireCredits` middleware gates `POST /api/transcripts`
- Credits deducted **before** transcript creation (STT cost + Gemini cost + 25% markup)
- `$set` for fresh activation, `$inc` for upgrades to preserve existing credits
- `checkPlanExpiry()` called in auth middleware on each authenticated request
- Both plans include: AI-enhanced tone & translation, Numeric & Planning formatting add-ons

## Rate Limiting
Three tiers via `express-rate-limit` (`src/middleware/rateLimit.middleware.ts`):
| Limiter | Scope | Limit |
|---------|-------|-------|
| `globalLimiter` | All endpoints | 60 req/min per IP |
| `authLimiter` | `/api/auth/*` | 10 req/min per IP |
| `transcriptLimiter` | `POST /api/transcripts` | 10 req/min per IP |

Rate limit responses use `sendError(res, '...', 429)` to maintain `ApiResponse` format.

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
- Max size: 25 MB
- Allowed MIME types: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`
- Magic bytes verified after disk write — invalid content returns 400 and deletes file
- Delete the uploaded file on failure: `fs.unlink(filePath, () => {})`

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
});
export const env = envSchema.parse(process.env);
```
Using `process.env.X` directly is **forbidden** — always use `env.X`.
