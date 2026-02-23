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
Using `res.json()` or `res.send()` directly is **forbidden**.

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

## Transcription Providers
Two providers are supported. The controller selects based on the `provider` query param.

### Groq SDK
```typescript
import Groq from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

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

const deepgram = createClient(env.DEEPGRAM_API_KEY);

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
The controller validates `language` against 35 supported codes:
```
en, tr, de, fr, es, pt, ja, ko, zh, ar, ru, it, nl, pl, hi,
bg, ca, cs, da, el, et, fi, hu, id, lv, lt, ms, no, ro, sk,
sl, sv, th, uk, vi
```
Default: `en`. Passed to the transcription service for better accuracy.

## Multer — Audio File Handling
- `upload.single('audio')` middleware is added to the route
- Field name: `audio` (must match frontend)
- Max size: 25 MB
- Allowed MIME types: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`
- Delete the uploaded file on failure: `fs.unlink(filePath, () => {})`

## Route Structure
For each new resource:
1. `src/routes/` → Router definition
2. `src/controllers/` → Business logic
3. `src/services/` → External service integration
4. `src/models/` → Mongoose model
5. Register the route in `src/index.ts`

## Error Handling
- Uncaught errors in controllers fall through to `error.middleware.ts`
- `errorMiddleware` is added as the last middleware via `app.use()`
- Async controllers can use `express-async-errors` or try-catch + next(err) for automatic error handling

## Import Rules
- `~/` alias is mandatory, relative imports (`../../`) are **forbidden**
- dayjs: `import dayjs from 'dayjs'` directly (no lib wrapper)
- Shared: `import { ITranscript } from '@voca/shared'`

## Env Validation
```typescript
// src/config/env.ts
const envSchema = z.object({
  PORT: z.coerce.number().positive().default(3100),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  DEEPGRAM_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
});
export const env = envSchema.parse(process.env);
```
Using `process.env.X` directly is **forbidden** — always use `env.X`.
