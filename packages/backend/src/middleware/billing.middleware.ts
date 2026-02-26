import { Request, Response, NextFunction } from 'express';
import { UserModel } from '~/models/user.model';
import { sendError } from '~/utils/response';

export const requireCredits = async (req: Request, res: Response, next: NextFunction) => {
  const user = await UserModel.findById(req.user!.id).select('plan credits subscriptionStatus');
  if (!user) return sendError(res, 'User not found', 404);

  if (!user.plan) {
    return sendError(res, 'Active plan required. Please subscribe to a plan.', 402);
  }

  if (user.credits <= 0) {
    return sendError(res, 'Insufficient credits. Please upgrade your plan.', 402);
  }

  next();
};
