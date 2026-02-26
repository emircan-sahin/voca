import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { sendError } from '~/utils/response';

function createLimiter(limit: number, messageKey: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip!),
    handler: (req, res) => sendError(res, req.t(messageKey), 429),
  });
}

export const globalLimiter = createLimiter(60, 'error.tooManyRequests');
export const authLimiter = createLimiter(10, 'error.tooManyAuth');
export const transcriptLimiter = createLimiter(10, 'error.tooManyTranscripts');
export const webhookLimiter = createLimiter(100, 'error.tooManyRequests');
