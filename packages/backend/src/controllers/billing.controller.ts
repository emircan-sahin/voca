import { Request, Response } from 'express';
import {
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionUpdatedEvent,
  SubscriptionCanceledEvent,
} from '@paddle/paddle-node-sdk';
import { checkoutSchema, PLAN_RANK } from '@voca/shared';
import { paddle } from '~/config/paddle';
import { env } from '~/config/env';
import { handleSubscriptionEvent, cancelSubscription } from '~/services/billing.service';
import { toIUser } from '~/services/auth.service';
import { UserModel } from '~/models/user.model';
import { sendSuccess, sendError } from '~/utils/response';
import { getErrorMessage } from '~/utils/error';
import { logger } from '~/config/logger';

// ── Paddle webhook types ────────────────────────────────────────

type SubscriptionEvent =
  | SubscriptionCreatedEvent
  | SubscriptionActivatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent;

interface PaddleCustomData {
  userId: string;
}

const SUBSCRIPTION_EVENTS = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionCanceled,
]);

function isSubscriptionEvent(event: { eventType: string }): event is SubscriptionEvent {
  return SUBSCRIPTION_EVENTS.has(event.eventType);
}

// ── Webhook ─────────────────────────────────────────────────────

export const webhook = async (req: Request, res: Response) => {
  const signature = req.headers['paddle-signature'] as string | undefined;
  if (!signature) return sendError(res, 'Bad request', 400);

  try {
    const event = await paddle.webhooks.unmarshal(
      req.body,
      env.PADDLE_WEBHOOK_SECRET,
      signature,
    );

    if (!isSubscriptionEvent(event)) {
      return sendSuccess(res, 'OK', null);
    }

    const { data } = event;
    const customData = data.customData as PaddleCustomData | null;
    const userId = customData?.userId;

    if (!userId) {
      logger.warn('Paddle', 'Webhook missing customData.userId, skipping');
      return sendSuccess(res, 'OK', null);
    }

    await handleSubscriptionEvent({
      subscriptionId: data.id,
      customerId: data.customerId,
      status: data.status,
      priceId: data.items[0]?.price?.id ?? '',
      currentPeriodEnd: data.currentBillingPeriod?.endsAt ?? null,
      userId,
    });

    return sendSuccess(res, 'OK', null);
  } catch (err) {
    logger.error('Paddle', `Webhook error: ${getErrorMessage(err)}`);
    return sendError(res, 'Bad request', 400);
  }
};

// ── Checkout ────────────────────────────────────────────────────

export const checkout = async (req: Request, res: Response) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, req.t('billing.invalidPlan'), 400);

  const priceId = parsed.data.plan === 'pro' ? env.PADDLE_PRICE_PRO : env.PADDLE_PRICE_MAX;

  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) return sendError(res, req.t('user.notFound'), 404);

    const hasLiveSub =
      user.paddleSubscriptionId &&
      user.subscriptionStatus &&
      user.subscriptionStatus !== 'canceled' &&
      !user.cancelScheduled;

    if (hasLiveSub) {
      if (user.subscriptionStatus === 'trialing') {
        return sendError(res, req.t('billing.trialNoChanges'), 400);
      }

      const currentRank = user.plan ? PLAN_RANK[user.plan] : 0;
      const targetRank = PLAN_RANK[parsed.data.plan];

      if (targetRank <= currentRank) {
        return sendError(res, req.t('billing.noDowngrade'), 400);
      }

      // Upgrade → prorate to new plan
      await paddle.subscriptions.update(user.paddleSubscriptionId!, {
        items: [{ priceId, quantity: 1 }],
        prorationBillingMode: 'prorated_immediately',
      });
      return sendSuccess(res, req.t('billing.planUpdated'), { updated: true });
    }

    // No live subscription → new checkout
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { userId: req.user!.id },
    });

    const url = transaction.checkout?.url;
    if (!url) return sendError(res, req.t('billing.checkoutFailed'), 500);

    return sendSuccess(res, req.t('billing.checkoutCreated'), { url });
  } catch (err) {
    logger.error('Paddle', `Checkout error: ${getErrorMessage(err)}`);
    return sendError(res, req.t('billing.checkoutFailed'), 500);
  }
};

// ── Config ──────────────────────────────────────────────────────

export const getConfig = async (req: Request, res: Response) => {
  return sendSuccess(res, req.t('billing.paddleConfig'), {
    clientToken: env.PADDLE_CLIENT_TOKEN,
    sandbox: env.PADDLE_SANDBOX,
  });
};

// ── Cancel ──────────────────────────────────────────────────────

export const cancel = async (req: Request, res: Response) => {
  try {
    await cancelSubscription(req.user!.id);
    const user = await UserModel.findById(req.user!.id);
    if (!user) return sendError(res, req.t('user.notFound'), 404);
    return sendSuccess(res, req.t('billing.cancelSuccess'), toIUser(user));
  } catch (err) {
    logger.error('Billing', `Cancel error: ${getErrorMessage(err)}`);
    return sendError(res, req.t('billing.cancelFailed'), 400);
  }
};
