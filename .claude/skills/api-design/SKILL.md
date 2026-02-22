# Skill: API Design

Her yeni route eklendiğinde bu kontrol listesini uygula.

## Zorunlu Adımlar

### 1. Route Tanımı (`src/routes/`)
```typescript
import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { createFoo, getFoos, deleteFoo } from '~/controllers/foo.controller';

const router = Router();
router.post('/', upload.single('file'), createFoo); // Dosya yükleme varsa
router.get('/', getFoos);
router.delete('/:id', deleteFoo);
export default router;
```

### 2. Controller (`src/controllers/`)
```typescript
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '~/utils/response';
import { IFoo } from '@voca/shared';

export const createFoo = async (req: Request, res: Response) => {
  // Validasyon
  if (!req.file) return sendError(res, 'File required', 400);

  // İş mantığı
  const doc = await FooModel.create({ ... });

  // Shared type'a map et (_id → id, Date → Unix ms)
  const foo: IFoo = {
    id: doc._id.toString(),
    // ... diğer alanlar
    createdAt: dayjs(doc.createdAt).valueOf(),
  };

  return sendSuccess(res, 'Başarılı', foo);
};
```

### 3. Service (Dış API varsa `src/services/`)
- Groq, S3, vs. entegrasyonları service'e taşı
- Controller iş mantığından bağımsız olmalı

### 4. Mongoose Model (`src/models/`)
- Internal alanlar eklenebilir (`audioPath`, vs.)
- Shared type'taki alanlar dışındakileri controller'a yansıtma

### 5. Route Kaydı (`src/index.ts`)
```typescript
app.use('/api/foos', fooRoutes);
```

## Kontrol Listesi
- [ ] `sendSuccess` / `sendError` kullanıldı
- [ ] `_id → id` dönüşümü yapıldı
- [ ] `Date → Unix ms` dönüşümü yapıldı
- [ ] Internal alanlar response'a dahil edilmedi
- [ ] Shared type import edildi (`@voca/shared`)
- [ ] Route `index.ts`'e eklendi
