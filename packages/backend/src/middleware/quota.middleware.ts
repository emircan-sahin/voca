import { Request, Response, NextFunction } from 'express';
import { UserModel } from '~/models/user.model';
import { env } from '~/config/env';
import { sendError } from '~/utils/response';
import { utcDay } from '~/services/usage.service';

// Runs before the upload so a user over today's cap doesn't send (or store) the audio at all.
export const requireDailyQuota = async (req: Request, res: Response, next: NextFunction) => {
  const user = await UserModel.findById(req.user!.id).select('usageDay usageSeconds').lean();

  if (user?.usageDay === utcDay() && user.usageSeconds >= env.DAILY_AUDIO_LIMIT_MINUTES * 60) {
    return sendError(res, req.t('error.dailyLimitReached'), 429);
  }

  next();
};
