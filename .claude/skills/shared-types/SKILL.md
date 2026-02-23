# Skill: Shared Types Security

## Critical Rule
`@voca/shared` contains only the **API contract**. It defines the data structure between client and server.

## Package Contents
```
packages/shared/src/
├── types/
│   ├── api.types.ts        # ApiResponse<T>
│   ├── auth.types.ts       # IUser, IAuthResponse
│   └── transcript.types.ts # ITranscript
├── schemas/
│   ├── auth.schema.ts      # userSchema, authResponseSchema, refreshBodySchema,
│   │                       # activatePlanSchema, userSettingsSchema
│   └── transcript.schema.ts# transcriptSchema
├── constants/
│   └── languages.ts        # LANGUAGES, LANGUAGE_CODES, TONES
└── index.ts                # Re-exports everything
```

## Never Add
- `_id` (MongoDB ObjectId) — use `id: string` only
- `__v` (Mongoose version key)
- Server-internal fields like `audioPath`, `filePath`, `refreshToken`
- `createdAt: Date` — use `createdAt: string` (ISO 8601) only
- Mongoose `Document` types

## Always Use
```typescript
// Correct
export interface ITranscript {
  id: string;              // string, not ObjectId
  text: string;
  duration: number;
  language: string;
  createdAt: string;       // ISO 8601, not Date
  translatedText?: string;
  targetLanguage?: string;
  tokenUsage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  credits: number;
  plan: 'pro' | 'max' | null;
  planExpiresAt: string | null;  // ISO 8601
  createdAt: string;
}

// Wrong
export interface ITranscript {
  _id: string;          // MongoDB internal
  audioPath: string;    // Server internal
  createdAt: Date;      // Date object
}
```

## Validation with Enums
Language fields must be validated against `LANGUAGE_CODES`:
```typescript
import { LANGUAGE_CODES, TONES } from '@voca/shared';

// In Zod schemas
language: z.enum(LANGUAGE_CODES)       // not z.string().min(1)
targetLanguage: z.enum(LANGUAGE_CODES) // not z.string().min(1)
tone: z.enum(TONES)                    // 'developer' | 'personal'
```

## Adding a New Type
1. Add it under `packages/shared/src/types/`
2. Add Zod schema under `packages/shared/src/schemas/`
3. Export it from `packages/shared/src/index.ts`
4. Build with `pnpm --filter @voca/shared build`

## Controller Mapping
```typescript
// Mongoose doc → Shared type
const item: IFoo = {
  id: doc._id.toString(),                    // ObjectId → string
  createdAt: doc.createdAt.toISOString(),     // Date → ISO 8601
  // only fields from the shared type
};
```
