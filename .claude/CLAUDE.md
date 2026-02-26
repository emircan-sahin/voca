# Voca — Master Guide

## Project Overview
An Electron desktop app that records audio, transcribes it to text via Groq/Deepgram APIs, translates with Gemini, and stores transcripts in MongoDB. Users authenticate via Google OAuth. The pnpm monorepo contains four packages:

- `@voca/shared` — TypeScript types, Zod schemas, and language constants
- `@voca/backend` — Express.js API server (port 3100)
- `@voca/app` — Electron + React application
- `@voca/web` — Landing page at usevoca.dev (Vite + React, static SPA)

## Communication Flow
```
Electron Renderer (React)
  → api wrapper (http://localhost:3100/api)
  → Express Routes (rate limited, CORS)
  → authenticate middleware (JWT)
  → requireCredits middleware (billing)
  → Controller
  → Groq/Deepgram Service (STT) + Gemini (translation)
  → MongoDB (Mongoose)
  → Returns ApiResponse<ITranscript>
```

## Authentication Flow
```
App → Opens browser → Google OAuth consent
  → Callback → voca:// deep link with tokens
  → Electron registers protocol handler
  → Stores JWT (15m access) + refresh token (7d) via safeStorage (encrypted)
  → Linux fallback: plaintext auth.json (when OS keychain unavailable)
  → Axios interceptor auto-refreshes on 401
```

## Billing Flow (Paddle v2)
```
User clicks Subscribe → Paddle checkout overlay opens (inline)
  → Payment processed by Paddle
  → Webhook (subscription.created/updated/canceled) → backend
  → Backend updates user plan, credits, expiry in MongoDB
  → requireCredits middleware gates POST /api/transcripts
  → 402 → frontend redirects to billing page
  → Plan expires after 30 days, cancel stops renewal
```

### Plan Features
| Feature | Pro ($3/mo) | Max ($10/mo) |
|---------|-------------|--------------|
| Free credits | $3/mo | $10/mo |
| STT providers | Groq & Deepgram | Groq & Deepgram |
| AI tone & translation | Yes | Yes |
| Numeric & Planning add-ons | Yes | Yes |
| Max upload size | 10 MB | 25 MB |

## Mandatory Rules

### ApiResponse<T>
Every API response must follow the `ApiResponse<T>` format:
```typescript
{ success: boolean; message: string; data: T | null }
```

### Shared Types
- `@voca/shared` contains the API contract: `IUser`, `ITranscript`, `ApiResponse<T>`, Zod schemas, `LANGUAGE_CODES`
- Internal fields (`_id`, `__v`) must **never** be added to shared types

### Path Alias
- `~/` is mandatory, relative imports are **forbidden** (exception: `@voca/shared` uses relative `../` for internal refs)

### Single Source of Truth
Enum values live as `as const` arrays in `@voca/shared`. Types derive from them, schemas reference them. Never hardcode the same union in multiple places.
```
BILLING_PLANS  → BillingPlan type  + z.enum(BILLING_PLANS)
STT_PROVIDERS  → SttProvider type  + z.enum(STT_PROVIDERS)
OAUTH_PROVIDERS → OAuthProvider type + z.enum(OAUTH_PROVIDERS)
TONES          → TranslationTone   + z.enum(TONES)
LANGUAGE_CODES → LanguageCode type + z.enum(LANGUAGE_CODES)
APP_LOCALES    → AppLocale type    + z.enum(APP_LOCALES)
```

### No Dead Imports
Every `import` must be used. After editing a file, verify no unused imports remain.

### No `unknown` Cast Hacks
Use direct calls (`doc._id.toString()`) or proper type narrowing. Never cast through `unknown`.

## Package Commands
```bash
pnpm dev:backend     # Start the backend
pnpm dev:app         # Start the Electron app
pnpm dev:web         # Start the landing page (port 3000)
pnpm dev             # Start both in parallel
pnpm build           # Build all packages
```

## Security — Open Source Repo
This is a **public repository**. Never commit or hardcode:
- API keys, tokens, passwords, or secrets
- `.env` files or credential files
- User data (emails, IDs) in code or logs
- Internal infrastructure details (IPs, DB connection strings)

All secrets must live in environment variables or GitHub Actions Secrets. Before every commit, verify no sensitive data is included in the diff.

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Verification Before Done
- Never mark a task complete without proving it works (`pnpm build` must pass).
- Ask yourself: "Would a staff engineer approve this?"
- Diff behavior between main and your changes when relevant.

## AI Behavior Rules

### Self-Review
After every implementation, re-read each changed file with fresh eyes. Check for: dead imports, stale references, missing null checks, silent error swallowing, off-by-one errors.

### Learning from Mistakes
When you make a mistake that you or the user catches (bug, wrong pattern, missed edge case), immediately log it to `.claude/LESSONS.md`:
```markdown
### [Category] Short description
- **Wrong**: what was done incorrectly
- **Right**: what the correct approach is
- **Why**: why the mistake happened
```
Review `LESSONS.md` at the start of every session to avoid repeating past mistakes.

### Documentation Sync on Push
When the user asks to commit/push, **before creating the commit**:
1. Check if the changes affect patterns documented in `.claude/` docs or skills
2. Update `BACKEND_CLAUDE.md`, `APP_CLAUDE.md`, or skill files if implementation changed
3. Update `README.md` only if the change is user-facing
4. Never update docs during implementation — only at commit time

## Detailed Rules
- Backend: `.claude/BACKEND_CLAUDE.md`
- App: `.claude/APP_CLAUDE.md`
- Lessons: `.claude/LESSONS.md`
