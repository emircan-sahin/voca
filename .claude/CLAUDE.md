# Voca — Master Guide

## Project Overview
An Electron desktop app that records audio, transcribes it to text via Groq Whisper API, and stores transcripts in MongoDB. The pnpm monorepo contains three packages:

- `@voca/shared` — TypeScript types and Zod schemas
- `@voca/backend` — Express.js API server (port 3001)
- `@voca/app` — Electron + React application

## Communication Flow
```
Electron Renderer (React)
  → axiosInstance (http://localhost:3001/api)
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
Use `sendSuccess` / `sendError` in the backend. Calling `res.json()` directly is **forbidden**.

### Shared Types
- `@voca/shared` contains only the API contract: `ITranscript`, `ApiResponse<T>`
- Internal fields (`_id`, `__v`, `audioPath`) must **never** be added to shared types
- `_id → id` mapping in the controller is mandatory

### HTTP Requests
- Use `axiosInstance` imported from `~/lib/axios` in the frontend
- `fetch()` is **forbidden**
- `try-catch` in service files is **forbidden** — the interceptor handles errors

### Path Alias
- `~/` is mandatory, relative imports are forbidden
- Backend: `~/` → `src/`
- App renderer: `~/` → `src/`

### dayjs
- Backend: `import dayjs from 'dayjs'` directly
- App: `import dayjs from '~/lib/dayjs'` (plugins pre-loaded)

### Env Variables
Must be validated with Zod — refer to `backend/src/config/env.ts`.

## Package Commands
```bash
pnpm dev:backend     # Start the backend
pnpm dev:app         # Start the Electron app
pnpm dev             # Start both in parallel
pnpm build           # Build all packages
```

## Detailed Rules
- Backend: `.claude/BACKEND_CLAUDE.md`
- App: `.claude/APP_CLAUDE.md`
