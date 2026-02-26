import { Request, Response, NextFunction } from 'express';
import { redis } from '~/config/redis';
import { sendError } from '~/utils/response';
import { logger } from '~/config/logger';

export const requireNoActiveTranscription = async (req: Request, res: Response, next: NextFunction) => {
  const key = `transcribing:${req.user!.id}`;
  const acquired = await redis.set(key, '1', 'EX', 300, 'NX');

  if (!acquired) {
    return sendError(res, req.t('error.transcriptionInProgress'), 409);
  }

  res.on('finish', () => {
    redis.del(key).catch((err) => logger.error('Redis', `Failed to release lock: ${err.message}`));
  });

  next();
};
