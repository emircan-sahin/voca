# Voca — Master Guide

## Project Overview
An Electron desktop app that records audio, transcribes it to text via Groq/Deepgram APIs, translates with Gemini, and stores transcripts in MongoDB. Users authenticate via Google OAuth. The pnpm monorepo contains three packages:

- `@voca/shared` — TypeScript types, Zod schemas, and language constants
- `@voca/backend` — Express.js API server (port 3100)
- `@voca/app` — Electron + React application

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
  → Stores JWT (15m access) + refresh token (7d)
  → Axios interceptor auto-refreshes on 401
```

## Billing Flow
```
User activates plan (Pro $3 / Max $10)
  → Credits allocated (300¢ / 1000¢)
  → Each transcription deducts real API cost (STT + Gemini + 25% markup)
  → requireCredits middleware gates POST /api/transcripts
  → 402 → frontend redirects to billing page
  → Plan expires after 30 days, cancel stops renewal
```

## Mandatory Rules

### ApiResponse<T>
Every API response must follow the `ApiResponse<T>` format:
```typescript
{ success: boolean; message: string; data: T | null }
```

### Shared Types
- `@voca/shared` contains the API contract: `IUser`, `ITranscript`, `ApiResponse<T>`, Zod schemas, `LANGUAGE_CODES`
- Internal fields (`_id`, `__v`, `audioPath`) must **never** be added to shared types

### Path Alias
- `~/` is mandatory, relative imports are **forbidden** (exception: `@voca/shared` uses relative `../` for internal refs)

## Package Commands
```bash
pnpm dev:backend     # Start the backend
pnpm dev:app         # Start the Electron app
pnpm dev             # Start both in parallel
pnpm build           # Build all packages
```

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Verification Before Done
- Never mark a task complete without proving it works (`pnpm build` must pass).
- Ask yourself: "Would a staff engineer approve this?"
- Diff behavior between main and your changes when relevant.

## Documentation Sync
When features are added, updated, or removed:
- Update the relevant `.claude/` docs (`CLAUDE.md`, `BACKEND_CLAUDE.md`, `APP_CLAUDE.md`) to reflect the change.
- If the change is user-facing and documented in `README.md`, update that too.
- Do this **after** the user approves and asks to commit — not during implementation.

## Detailed Rules
- Backend: `.claude/BACKEND_CLAUDE.md`
- App: `.claude/APP_CLAUDE.md`
