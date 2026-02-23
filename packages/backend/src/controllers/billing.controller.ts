import { Request, Response } from 'express';
import { activatePlanSchema } from '@voca/shared';
import { activatePlan, cancelRenewal } from '~/services/billing.service';
import { toIUser } from '~/services/auth.service';
import { sendSuccess, sendError } from '~/utils/response';
import { getErrorMessage } from '~/utils/error';

export const activate = async (req: Request, res: Response) => {
  const parsed = activatePlanSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid plan', 400);

  try {
    const user = await activatePlan(req.user!.id, parsed.data.plan);
    console.log(`[Billing] plan activated: ${parsed.data.plan}`);
    return sendSuccess(res, 'Plan activated', toIUser(user));
  } catch (err) {
    return sendError(res, getErrorMessage(err), 400);
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const user = await cancelRenewal(req.user!.id);
    console.log('[Billing] renewal cancelled');
    return sendSuccess(res, 'Renewal cancelled', toIUser(user));
  } catch (err) {
    return sendError(res, getErrorMessage(err), 400);
  }
};
