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
  if (!signature) return res.status(400).send('Missing signature');

  try {
    const event = await paddle.webhooks.unmarshal(
      req.body,
      env.PADDLE_WEBHOOK_SECRET,
      signature,
    );

    if (!isSubscriptionEvent(event)) {
      return res.status(200).send('OK');
    }

    const { data } = event;
    const customData = data.customData as PaddleCustomData | null;
    const userId = customData?.userId;

    if (!userId) {
      console.warn('[Paddle] Webhook missing customData.userId, skipping');
      return res.status(200).send('OK');
    }

    await handleSubscriptionEvent({
      subscriptionId: data.id,
      customerId: data.customerId,
      status: data.status,
      priceId: data.items[0]?.price?.id ?? '',
      currentPeriodEnd: data.currentBillingPeriod?.endsAt ?? null,
      userId,
    });

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[Paddle] Webhook error:', getErrorMessage(err));
    return res.status(400).send('Invalid webhook');
  }
};

// ── Checkout ────────────────────────────────────────────────────

export const checkout = async (req: Request, res: Response) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid plan', 400);

  const priceId = parsed.data.plan === 'pro' ? env.PADDLE_PRICE_PRO : env.PADDLE_PRICE_MAX;

  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) return sendError(res, 'User not found', 404);

    const hasLiveSub =
      user.paddleSubscriptionId &&
      user.subscriptionStatus &&
      user.subscriptionStatus !== 'canceled' &&
      !user.cancelScheduled;

    if (hasLiveSub) {
      if (user.subscriptionStatus === 'trialing') {
        return sendError(res, 'Plan changes are not available during trial.', 400);
      }

      const currentRank = user.plan ? PLAN_RANK[user.plan] : 0;
      const targetRank = PLAN_RANK[parsed.data.plan];

      if (targetRank <= currentRank) {
        return sendError(res, 'Downgrades are not supported. Cancel and resubscribe instead.', 400);
      }

      // Upgrade → prorate to new plan
      await paddle.subscriptions.update(user.paddleSubscriptionId!, {
        items: [{ priceId, quantity: 1 }],
        prorationBillingMode: 'prorated_immediately',
      });
      return sendSuccess(res, 'Plan updated', { updated: true });
    }

    // No live subscription → new checkout
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { userId: req.user!.id },
    });

    const url = transaction.checkout?.url;
    if (!url) return sendError(res, 'Failed to create checkout', 500);

    return sendSuccess(res, 'Checkout created', { url });
  } catch (err) {
    console.error('[Paddle] Checkout error:', getErrorMessage(err));
    return sendError(res, 'Failed to create checkout', 500);
  }
};

// ── Config ──────────────────────────────────────────────────────

export const getConfig = async (_req: Request, res: Response) => {
  return sendSuccess(res, 'Paddle config', {
    clientToken: env.PADDLE_CLIENT_TOKEN,
    sandbox: env.PADDLE_SANDBOX,
  });
};

// ── Cancel ──────────────────────────────────────────────────────

export const cancel = async (req: Request, res: Response) => {
  try {
    await cancelSubscription(req.user!.id);
    const user = await UserModel.findById(req.user!.id);
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, 'Subscription will cancel at period end', toIUser(user));
  } catch (err) {
    return sendError(res, getErrorMessage(err), 400);
  }
};
