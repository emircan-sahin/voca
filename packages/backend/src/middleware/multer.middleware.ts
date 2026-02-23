import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '~/utils/response';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

// Magic byte signatures for audio formats
const AUDIO_SIGNATURES: { mime: string; check: (buf: Buffer) => boolean }[] = [
  { mime: 'audio/wav', check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 },
  { mime: 'audio/mpeg', check: (b) => (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) },
  { mime: 'audio/ogg', check: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },
  { mime: 'audio/webm', check: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: 'audio/mp4', check: (b) => b.length >= 8 && b.slice(4, 8).toString() === 'ftyp' },
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
    const ext = path.extname(file.originalname) || '.webm';
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
    multerUpload.single(field)(req, res, (err) => {
      if (err) return next(err);

      if (req.file && !isValidAudioFile(req.file.path)) {
        fs.unlink(req.file.path, () => {});
        return sendError(res, 'Invalid audio file content', 400);
      }

      next();
    });
  },
};
