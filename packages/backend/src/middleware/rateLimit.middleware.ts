import rateLimit from 'express-rate-limit';
import { sendError } from '~/utils/response';

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 'Too many requests, please try again later', 429),
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 'Too many auth attempts, please try again later', 429),
});

export const transcriptLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 'Too many transcription requests, please try again later', 429),
});
