# Voca — Master Guide

## Project Overview
An Electron desktop app that records audio, transcribes it to text via Groq/Deepgram APIs, and stores transcripts in MongoDB. The pnpm monorepo contains three packages:

- `@voca/shared` — TypeScript types and Zod schemas
- `@voca/backend` — Express.js API server (port 3100)
- `@voca/app` — Electron + React application

## Communication Flow
```
Electron Renderer (React)
  → api wrapper (http://localhost:3100/api)
  → Express Routes
  → Controller
  → Groq Service (Whisper API)
  → MongoDB (Mongoose)
  → Returns ApiResponse<ITranscript>
```

## Mandatory Rules

### ApiResponse<T>
Every API response must follow the `ApiResponse<T>` format:
```typescript
{ success: boolean; message: string; data: T | null }
```

### Shared Types
- `@voca/shared` contains only the API contract: `ITranscript`, `ApiResponse<T>`
- Internal fields (`_id`, `__v`, `audioPath`) must **never** be added to shared types

### Path Alias
- `~/` is mandatory, relative imports are **forbidden**

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
