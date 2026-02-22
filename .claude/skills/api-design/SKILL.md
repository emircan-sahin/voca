# Skill: API Design

Apply this checklist whenever a new route is added.

## Required Steps

### 1. Route Definition (`src/routes/`)
```typescript
import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { createFoo, getFoos, deleteFoo } from '~/controllers/foo.controller';

const router = Router();
router.post('/', upload.single('audio'), createFoo); // 'audio' field name for file uploads
router.get('/', getFoos);
router.delete('/:id', deleteFoo);
export default router;
```

### 2. Controller (`src/controllers/`)
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from '~/utils/response';
import { IFoo } from '@voca/shared';

// Validate query params with Zod
const querySchema = z.object({
  provider: z.enum(['groq', 'deepgram']).default('groq'),
  language: z.enum(SUPPORTED_LANGUAGES).default('en'),
});

export const createFoo = async (req: Request, res: Response) => {
  // Validation
  if (!req.file) return sendError(res, 'File required', 400);
  const { provider, language } = querySchema.parse(req.query);

  // Transcribe via selected provider
  const result = await transcribeAudio(req.file.path, language);

  // Hallucination check — return 422 if detected
  if (result.hallucination) {
    fs.unlink(req.file.path, () => {});
    return sendError(res, 'No speech detected, please try again.', 422);
  }

  // Business logic
  const doc = await FooModel.create({ ... });

  // Map to shared type (_id → id, Date → Unix ms)
  const foo: IFoo = {
    id: doc._id.toString(),
    // ... other fields
    createdAt: dayjs(doc.createdAt).valueOf(),
  };

  return sendSuccess(res, 'Success', foo);
};
```

### 3. Service (if external API is involved — `src/services/`)
- Move Groq, Deepgram, S3, etc. integrations into a service
- Must be independent from controller business logic
- Return a typed result (e.g. `TranscriptionResult`) including a `hallucination` flag

### 4. Mongoose Model (`src/models/`)
- Internal fields can be added (`audioPath`, etc.)
- Do not expose fields outside the shared type to the controller

### 5. Route Registration (`src/index.ts`)
```typescript
app.use('/api/foos', fooRoutes);
```

## Checklist
- [ ] Used `sendSuccess` / `sendError`
- [ ] Applied `_id → id` mapping
- [ ] Applied `Date → Unix ms` mapping
- [ ] Internal fields excluded from response
- [ ] Shared type imported from `@voca/shared`
- [ ] Query params validated with Zod
- [ ] Hallucination / error cases handled with file cleanup
- [ ] Route registered in `index.ts`
