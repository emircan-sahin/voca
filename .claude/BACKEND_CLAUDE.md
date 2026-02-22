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
  createdAt: dayjs(doc.createdAt).valueOf(), // Unix ms
};
return sendSuccess(res, 'Success', transcript);
```
**Never** expose internal fields like `audioPath`, `__v`, `createdAt` (Date).

## Groq SDK Usage
```typescript
import Groq from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const transcription = await groq.audio.transcriptions.create({
  file: fs.createReadStream(filePath),
  model: 'whisper-large-v3',
  response_format: 'verbose_json',
});
```
Model: `whisper-large-v3` only.

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

## Env Validation
```typescript
// src/config/env.ts
const envSchema = z.object({
  PORT: z.string().default('3001'),
  MONGODB_URI: z.string(),
  GROQ_API_KEY: z.string(),
});
export const env = envSchema.parse(process.env);
```
Using `process.env.X` directly is **forbidden** — always use `env.X`.
