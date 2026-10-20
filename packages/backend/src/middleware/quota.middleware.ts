import { Request, Response, NextFunction } from 'express';
import { sendError } from '~/utils/response';
import { isOverDailyQuota } from '~/services/usage.service';

// Runs before the upload so a user over today's cap doesn't send (or store) the audio at all.
export const requireDailyQuota = async (req: Request, res: Response, next: NextFunction) => {
  if (await isOverDailyQuota(req.user!.id)) {
    return sendError(res, req.t('error.dailyLimitReached'), 429);
  }

  next();
};
