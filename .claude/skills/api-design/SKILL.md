# Skill: API Design

Apply this checklist whenever a new route is added.

## Middleware Chain
Every request passes through this pipeline (order matters):
```
cors → express.json → globalLimiter → logging → routes → 404 → errorMiddleware
```
Per-route middleware:
```
authenticate → [rateLimiter] → [requireCredits] → [multer] → controller
```

## Required Steps

### 1. Route Definition (`src/routes/`)
```typescript
import { Router } from 'express';
import { authenticate } from '~/middleware/auth.middleware';
import { upload } from '~/middleware/multer.middleware';
import { createFoo, getFoos, deleteFoo } from '~/controllers/foo.controller';

const router = Router();
router.post('/', authenticate, upload.single('audio'), createFoo);
router.get('/', authenticate, getFoos);
router.delete('/:id', authenticate, deleteFoo);
export default router;
```

### 2. Controller (`src/controllers/`)
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from '~/utils/response';
import { safeUnlink } from '~/utils/fs';
import { getErrorMessage } from '~/utils/error';
import { IFoo, LANGUAGE_CODES, STT_PROVIDERS } from '@voca/shared';

// Validate query params with Zod — use safeParse, not parse
// Use shared constants for enums — never hardcode
const querySchema = z.object({
  provider: z.enum(STT_PROVIDERS).default('groq'),
  language: z.enum(LANGUAGE_CODES).default('en'),
});

// Extract mapping helper when used 2+ times
function toIFoo(doc: IFooDocument): IFoo {
  return {
    id: doc._id.toString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export const createFoo = async (req: Request, res: Response) => {
  if (!req.file) return sendError(res, 'File required', 400);

  const filePath = req.file.path;
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    safeUnlink(filePath);
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }
  const { provider, language } = parsed.data;

  try {
    const result = await transcribeAudio(filePath, language);

    if (result.hallucination) {
      safeUnlink(filePath);
      return sendError(res, 'No speech detected, please try again.', 422);
    }

    const doc = await FooModel.create({ ...data, userId: req.user!.id });
    return sendSuccess(res, 'Success', toIFoo(doc));
  } catch (err) {
    safeUnlink(filePath);
    throw err;
  }
};
```

### 3. Service (if external API is involved — `src/services/`)
- Move Groq, Deepgram, Gemini, etc. integrations into a service
- Must be independent from controller business logic
- Return a typed result (e.g. `TranscriptionResult`) including a `hallucination` flag

### 4. Mongoose Model (`src/models/`)
- Internal fields can be added (`audioPath`, `userId`, etc.)
- Do not expose fields outside the shared type to the controller

### 5. Route Registration (`src/index.ts`)
```typescript
import fooRoutes from '~/routes/foo.routes';
app.use('/api/foos', fooRoutes);
```

### 6. Rate Limiting (if needed — `src/middleware/rateLimit.middleware.ts`)
Add a route-specific limiter using the `createLimiter()` factory:
```typescript
export const fooLimiter = createLimiter(10, 'Too many foo requests, please try again later');
```

## Existing Routes
| Route | Middleware | Rate Limit |
|-------|-----------|------------|
| `/api/auth` | authLimiter | 10/min |
| `/api/transcripts` POST | authenticate, transcriptLimiter, requireCredits, multer | 10/min |
| `/api/transcripts` GET/DELETE | authenticate | global only |
| `/api/billing` | authenticate | global only |

## Checklist
- [ ] Used `sendSuccess` / `sendError` (never `res.json()` directly)
- [ ] Extracted `toIX()` mapping helper (never inline doc → type mapping 2+ times)
- [ ] Applied `_id → id` and `Date → ISO 8601` mapping
- [ ] Internal fields excluded from response
- [ ] Shared type imported from `@voca/shared`
- [ ] Enums use shared constants (`STT_PROVIDERS`, `LANGUAGE_CODES`, `TONES`, `BILLING_PLANS`)
- [ ] Query/body params validated with Zod `safeParse()`
- [ ] File cleanup uses `safeUnlink()` (never `fs.unlink(path, () => {})`)
- [ ] Error extraction uses `getErrorMessage()` (never `(err as Error).message`)
- [ ] `authenticate` middleware added for protected routes
- [ ] Rate limiter uses `createLimiter()` factory
- [ ] Route registered in `index.ts`
