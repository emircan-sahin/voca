import { PLAN_CREDITS, TRIAL_CREDITS, SUBSCRIPTION_STATUSES, BillingPlan, SubscriptionStatus } from '@voca/shared';
import { UserModel, IUserDocument } from '~/models/user.model';
import { paddle } from '~/config/paddle';
import { env } from '~/config/env';
import { logger } from '~/config/logger';

// 25% markup on API costs
// DeepSeek V4.1 Flash at peak rates, cache miss: $0.30/1M input, $1.20/1M output (api-docs.deepseek.com, 2026-10)
const MARKUP = 1.25;

const LLM_TOKEN_RATES = {
  input: (0.30 / 1_000_000) * MARKUP,
  output: (1.20 / 1_000_000) * MARKUP,
} as const;

export function calculateCost(
  sttCost: number,
  tokenUsage?: { inputTokens: number; outputTokens: number }
): number {
  let cost = sttCost * MARKUP;
  if (tokenUsage) {
    cost += LLM_TOKEN_RATES.input * tokenUsage.inputTokens;
    cost += LLM_TOKEN_RATES.output * tokenUsage.outputTokens;
  }
  return Math.round(cost * 10000) / 10000;
}

// ── Paddle helpers ──────────────────────────────────────────────

export interface SubscriptionEventData {
  subscriptionId: string;
  customerId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: string | null;
  userId: string;
  occurredAt: string;
}

function priceIdToPlan(priceId: string): BillingPlan | null {
  if (priceId === env.PADDLE_PRICE_PRO) return 'pro';
  if (priceId === env.PADDLE_PRICE_MAX) return 'max';
  return null;
}

/**
 * Determine if this event should grant (reset) credits.
 *
 * Credits are granted only on:
 *  1. New subscription (different subscriptionId)
 *  2. Trial → active transition (first payment)
 *  3. Renewal (billing period advanced while already active)
 *  4. Plan upgrade (e.g. pro → max)
 */
function resolveCredits(
  plan: BillingPlan,
  newStatus: SubscriptionStatus,
  user: IUserDocument,
  newPeriodEnd: Date | null,
  isNewSubscription: boolean,
): number | undefined {
  if (isNewSubscription) {
    return newStatus === 'trialing' ? TRIAL_CREDITS[plan] : PLAN_CREDITS[plan];
  }

  if (newStatus === 'active' && user.subscriptionStatus === 'trialing') {
    return PLAN_CREDITS[plan];
  }

  // Plan upgrade (e.g. pro → max): grant new plan's credits
  if (newStatus === 'active' && user.plan && plan !== user.plan) {
    return PLAN_CREDITS[plan];
  }

  if (newStatus === 'active' && user.subscriptionStatus === 'active' && newPeriodEnd) {
    const storedEnd = user.currentPeriodEnd?.getTime() ?? 0;
    if (newPeriodEnd.getTime() > storedEnd) {
      return PLAN_CREDITS[plan];
    }
  }

  return undefined;
}

const isSubscriptionStatus = (s: string): s is SubscriptionStatus =>
  (SUBSCRIPTION_STATUSES as readonly string[]).includes(s);

// ── Public API ──────────────────────────────────────────────────

export async function handleSubscriptionEvent(data: SubscriptionEventData): Promise<void> {
  const user = await UserModel.findById(data.userId);
  if (!user) {
    logger.warn('Billing', 'User not found for subscription event', { subscriptionId: data.subscriptionId });
    return;
  }

  // Paddle doesn't guarantee delivery order (retries included), so an older event must never
  // overwrite a newer one. The filter re-checks atomically against a concurrent delivery.
  const occurredAt = new Date(data.occurredAt);
  if (user.lastPaddleEventAt && occurredAt < user.lastPaddleEventAt) {
    logger.info('Billing', 'Skipping out-of-order subscription event', { subscriptionId: data.subscriptionId });
    return;
  }
  const filter = {
    _id: data.userId,
    $or: [{ lastPaddleEventAt: null }, { lastPaddleEventAt: { $lte: occurredAt } }],
  };

  // Paddle also sends past_due/paused. updateOne skips enum validation, so storing one would
  // make every later user.save() (e.g. login) fail; leave the user's state untouched instead.
  const status = data.status;
  if (!isSubscriptionStatus(status)) {
    logger.warn('Billing', `Unhandled subscription status: ${status}`, { subscriptionId: data.subscriptionId, status });
    return;
  }

  // ── Canceled: subscription fully ended — reset to free ──
  // Handled before plan check — canceled events don't need plan info
  if (status === 'canceled') {
    // A late cancel for a previous subscription must not wipe the one the user has now.
    if (data.subscriptionId !== user.paddleSubscriptionId) {
      logger.info('Billing', 'Skipping cancel for a non-current subscription', { subscriptionId: data.subscriptionId });
      return;
    }
    await UserModel.updateOne(filter, {
      $set: {
        subscriptionStatus: 'canceled',
        cancelScheduled: false,
        plan: null,
        credits: 0,
        currentPeriodEnd: null,
        lastPaddleEventAt: occurredAt,
      },
    });
    logger.info('Billing', `${data.subscriptionId} → canceled`, { subscriptionId: data.subscriptionId });
    return;
  }

  const plan = priceIdToPlan(data.priceId);
  if (!plan) {
    logger.warn('Billing', `Unknown price ID: ${data.priceId}`);
    return;
  }

  // ── Trialing / Active: update subscription state ──
  const isNewSubscription = data.subscriptionId !== user.paddleSubscriptionId;
  const periodEnd = data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null;
  const credits = resolveCredits(plan, status, user, periodEnd, isNewSubscription);

  const update: Record<string, unknown> = {
    plan,
    paddleCustomerId: data.customerId,
    paddleSubscriptionId: data.subscriptionId,
    subscriptionStatus: status,
    currentPeriodEnd: periodEnd,
    lastPaddleEventAt: occurredAt,
  };

  // Only reset cancelScheduled when meaningful state changes happen,
  // NOT on every subscription.updated (which fires for cancel scheduling too)
  if (isNewSubscription || credits !== undefined) {
    update.cancelScheduled = false;
  }

  if (credits !== undefined) {
    update.credits = credits;
  }

  await UserModel.updateOne(filter, { $set: update });
  logger.info('Billing', `${data.subscriptionId} → ${status} (${plan})${credits !== undefined ? ` credits=$${credits}` : ''}`, { subscriptionId: data.subscriptionId, status, plan, credits });
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.paddleSubscriptionId) throw new Error('No active subscription');
  if (user.cancelScheduled) throw new Error('Cancellation already scheduled');

  await paddle.subscriptions.cancel(user.paddleSubscriptionId, {
    effectiveFrom: 'next_billing_period',
  });

  await UserModel.findByIdAndUpdate(userId, { $set: { cancelScheduled: true } });
}

// Called after the transcription is already paid for, so it never refuses: the balance may dip
// below zero, and requireCredits (credits <= 0) blocks the next request instead.
export async function deductCredits(userId: string, amount: number): Promise<void> {
  await UserModel.updateOne({ _id: userId }, { $inc: { credits: -amount } });
}
