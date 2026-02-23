import rateLimit from 'express-rate-limit';
import { sendError } from '~/utils/response';

function createLimiter(limit: number, message: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, message, 429),
  });
}

export const globalLimiter = createLimiter(60, 'Too many requests, please try again later');
export const authLimiter = createLimiter(10, 'Too many auth attempts, please try again later');
export const transcriptLimiter = createLimiter(10, 'Too many transcription requests, please try again later');
