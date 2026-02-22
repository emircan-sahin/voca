# Skill: Shared Types Security

## Critical Rule
`@voca/shared` contains only the **API contract**. It defines the data structure between client and server.

## Never Add
- `_id` (MongoDB ObjectId) — use `id: string` only
- `__v` (Mongoose version key)
- Server-internal fields like `audioPath`, `filePath`, `internalNote`
- `createdAt: Date` — use `createdAt: number` (Unix ms) only
- Mongoose `Document` types

## Always Use
```typescript
// Correct
export interface ITranscript {
  id: string;           // string, not ObjectId
  text: string;
  duration: number;
  language: string;
  createdAt: number;    // Unix ms, not Date
}

// Wrong
export interface ITranscript {
  _id: string;          // MongoDB internal
  audioPath: string;    // Server internal
  createdAt: Date;      // Date object
}
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
  id: doc._id.toString(),        // ObjectId → string
  createdAt: dayjs(doc.createdAt).valueOf(), // Date → Unix ms
  // only fields from the shared type
};
```
