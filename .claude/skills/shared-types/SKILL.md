# Skill: Shared Types Security

## Critical Rule
`@voca/shared` contains only the **API contract**. It defines the data structure between client and server.

## Package Contents
```
packages/shared/src/
├── types/
│   ├── api.types.ts        # ApiResponse<T>
│   ├── auth.types.ts       # IUser, IAuthResponse, IUserSettings,
│   │                       # BILLING_PLANS, OAUTH_PROVIDERS, STT_PROVIDERS,
│   │                       # BillingPlan, OAuthProvider, SttProvider, LanguageCode
│   └── transcript.types.ts # ITranscript, ITokenUsage
├── schemas/
│   ├── auth.schema.ts      # userSchema, authResponseSchema, refreshBodySchema,
│   │                       # activatePlanSchema, userSettingsSchema
│   └── transcript.schema.ts# transcriptSchema
├── constants/
│   └── languages.ts        # LANGUAGES, LANGUAGE_CODES, TONES, TranslationTone
└── index.ts                # Re-exports everything
```

## Never Add
- `_id` (MongoDB ObjectId) — use `id: string` only
- `__v` (Mongoose version key)
- Server-internal fields like `audioPath`, `filePath`, `refreshToken`
- `createdAt: Date` — use `createdAt: string` (ISO 8601) only
- Mongoose `Document` types

## Single Source of Truth
Enum values are `as const` arrays. Types derive from them. Schemas reference them. **Never hardcode the same union in multiple places.**

```typescript
// Constants (source of truth)
export const BILLING_PLANS = ['pro', 'max'] as const;
export const OAUTH_PROVIDERS = ['google', 'apple'] as const;
export const STT_PROVIDERS = ['groq', 'deepgram'] as const;
// TONES and LANGUAGE_CODES live in constants/languages.ts

// Types (derived)
export type BillingPlan = (typeof BILLING_PLANS)[number];
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export type SttProvider = (typeof STT_PROVIDERS)[number];
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

// Interfaces (use derived types, not inline unions)
export interface IUser {
  provider: OAuthProvider;     // not 'google' | 'apple'
  plan: BillingPlan | null;    // not 'pro' | 'max' | null
}
export interface IUserSettings {
  provider: SttProvider;       // not 'groq' | 'deepgram'
  language: LanguageCode;      // not string
  translation: {
    tone: TranslationTone;     // not 'developer' | 'personal'
    targetLanguage: LanguageCode;
  };
}

// Schemas (reference constants)
z.enum(BILLING_PLANS)    // not z.enum(['pro', 'max'])
z.enum(STT_PROVIDERS)    // not z.enum(['groq', 'deepgram'])
z.enum(LANGUAGE_CODES)   // not z.string().min(1)
z.enum(TONES)            // not z.enum(['developer', 'personal'])
```

## Never Add
- `_id` (MongoDB ObjectId) — use `id: string` only
- `__v` (Mongoose version key)
- Server-internal fields like `audioPath`, `filePath`, `refreshToken`
- `createdAt: Date` — use `createdAt: string` (ISO 8601) only
- Mongoose `Document` types

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
