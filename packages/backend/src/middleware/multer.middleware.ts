import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { BillingPlan, PLAN_UPLOAD_LIMIT } from '@voca/shared';
import { UserModel } from '~/models/user.model';
import { sendError } from '~/utils/response';
import { safeUnlink } from '~/utils/fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_EXTS = ['.webm', '.mp4', '.mpeg', '.mp3', '.wav', '.ogg', '.m4a'];

// Magic byte signatures for audio formats
const AUDIO_SIGNATURES: { check: (buf: Buffer) => boolean }[] = [
  { check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 },  // WAV (RIFF)
  { check: (b) => (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) },  // MP3
  { check: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },  // OGG
  { check: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },  // WebM (EBML)
  { check: (b) => b.length >= 8 && b.slice(4, 8).toString() === 'ftyp' },  // MP4
];

function isValidAudioFile(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return AUDIO_SIGNATURES.some((sig) => sig.check(buf));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return cb(new Error(`Unsupported audio format: ${ext}`), '');
    }
    cb(null, `audio-${Date.now()}${ext}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

export const upload = {
  single: (field: string) => (req: Request, res: Response, next: NextFunction) => {
    multerUpload.single(field)(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      if (!isValidAudioFile(req.file.path)) {
        safeUnlink(req.file.path);
        return sendError(res, req.t('error.invalidAudio'), 400);
      }

      // Plan-based file size limit
      const user = await UserModel.findById(req.user!.id).select('plan').lean();
      const plan = (user?.plan ?? 'pro') as BillingPlan;
      const limit = PLAN_UPLOAD_LIMIT[plan];
      if (req.file.size > limit) {
        safeUnlink(req.file.path);
        const limitMB = limit / (1024 * 1024);
        return sendError(res, req.t('error.fileTooLargePlan', { limit: limitMB, plan }), 400);
      }

      next();
    });
  },
};
