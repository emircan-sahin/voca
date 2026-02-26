import { PLAN_CREDITS, TRIAL_CREDITS, BillingPlan, SubscriptionStatus } from '@voca/shared';
import { UserModel, IUserDocument } from '~/models/user.model';
import { paddle } from '~/config/paddle';
import { env } from '~/config/env';

// 25% markup on API costs
// Gemini 2.0 Flash: $0.10/1M input, $0.40/1M output
const MARKUP = 1.25;

const GEMINI_TOKEN_RATES = {
  input: (0.10 / 1_000_000) * MARKUP,
  output: (0.40 / 1_000_000) * MARKUP,
} as const;

export function calculateCost(
  sttCost: number,
  tokenUsage?: { inputTokens: number; outputTokens: number }
): number {
  let cost = sttCost * MARKUP;
  if (tokenUsage) {
    cost += GEMINI_TOKEN_RATES.input * tokenUsage.inputTokens;
    cost += GEMINI_TOKEN_RATES.output * tokenUsage.outputTokens;
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

// ── Public API ──────────────────────────────────────────────────

export async function handleSubscriptionEvent(data: SubscriptionEventData): Promise<void> {
  const user = await UserModel.findById(data.userId);
  if (!user) {
    console.warn(`[Billing] User not found: ${data.userId}`);
    return;
  }

  const status = data.status as SubscriptionStatus;

  // ── Canceled: subscription fully ended — reset to free ──
  // Handled before plan check — canceled events don't need plan info
  if (status === 'canceled') {
    await UserModel.findByIdAndUpdate(data.userId, {
      $set: {
        subscriptionStatus: 'canceled',
        cancelScheduled: false,
        plan: null,
        credits: 0,
        currentPeriodEnd: null,
      },
    });
    console.log(`[Billing] ${data.subscriptionId} → canceled`);
    return;
  }

  const plan = priceIdToPlan(data.priceId);
  if (!plan) {
    console.warn(`[Billing] Unknown price ID: ${data.priceId}`);
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
  };

  // Only reset cancelScheduled when meaningful state changes happen,
  // NOT on every subscription.updated (which fires for cancel scheduling too)
  if (isNewSubscription || credits !== undefined) {
    update.cancelScheduled = false;
  }

  if (credits !== undefined) {
    update.credits = credits;
  }

  await UserModel.findByIdAndUpdate(data.userId, { $set: update });
  console.log(
    `[Billing] ${data.subscriptionId} → ${status} (${plan})` +
    (credits !== undefined ? ` credits=$${credits}` : ''),
  );
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

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const result = await UserModel.updateOne(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } }
  );
  return result.modifiedCount > 0;
}
