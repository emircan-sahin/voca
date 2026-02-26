import rateLimit from 'express-rate-limit';
import { sendError } from '~/utils/response';

function createLimiter(limit: number, messageKey: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => sendError(res, req.t(messageKey), 429),
  });
}

export const globalLimiter = createLimiter(60, 'error.tooManyRequests');
export const authLimiter = createLimiter(10, 'error.tooManyAuth');
export const transcriptLimiter = createLimiter(10, 'error.tooManyTranscripts');
