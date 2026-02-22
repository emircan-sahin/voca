# Skill: Shared Types Security

## Kritik Kural
`@voca/shared` sadece **API contract** içerir. İstemci ile sunucu arasındaki veri yapısını tanımlar.

## Asla Ekleme
- `_id` (MongoDB ObjectId) — sadece `id: string` kullan
- `__v` (Mongoose version key)
- `audioPath`, `filePath`, `internalNote` gibi sunucu-internal alanlar
- `createdAt: Date` — sadece `createdAt: number` (Unix ms)
- Mongoose `Document` türleri

## Her Zaman Kullan
```typescript
// ✅ Doğru
export interface ITranscript {
  id: string;           // string, ObjectId değil
  text: string;
  duration: number;
  language: string;
  createdAt: number;    // Unix ms, Date değil
}

// ❌ Yanlış
export interface ITranscript {
  _id: string;          // MongoDB internal
  audioPath: string;    // Server internal
  createdAt: Date;      // Date objesi
}
```

## Yeni Tip Eklerken
1. `packages/shared/src/types/` altına ekle
2. Zod şemasını `packages/shared/src/schemas/` altına ekle
3. `packages/shared/src/index.ts`'e export ekle
4. `pnpm --filter @voca/shared build` ile derle

## Controller'da Mapping
```typescript
// Mongoose doc → Shared type
const item: IFoo = {
  id: doc._id.toString(),        // ObjectId → string
  createdAt: dayjs(doc.createdAt).valueOf(), // Date → Unix ms
  // sadece shared type'taki alanlar
};
```
