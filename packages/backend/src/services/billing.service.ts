import dayjs from 'dayjs';
import { PLAN_CREDITS, PLAN_RANK, BillingPlan } from '@voca/shared';
import { UserModel, IUserDocument } from '~/models/user.model';

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

export async function activatePlan(userId: string, plan: BillingPlan): Promise<IUserDocument> {
  const existing = await UserModel.findById(userId);
  if (!existing) throw new Error('User not found');

  if (existing.plan) {
    if (PLAN_RANK[plan] <= PLAN_RANK[existing.plan]) {
      throw new Error('Cannot downgrade plan');
    }
  }

  const credits = PLAN_CREDITS[plan];
  const expiresAt = dayjs().add(30, 'day').toDate();
  const isUpgrade = !!existing.plan;

  const update = isUpgrade
    ? { $inc: { credits }, $set: { plan, planExpiresAt: expiresAt } }
    : { $set: { credits, plan, planExpiresAt: expiresAt } };

  const user = await UserModel.findByIdAndUpdate(userId, update, { new: true });
  return user!;
}

export async function cancelRenewal(userId: string): Promise<IUserDocument> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { plan: null, planExpiresAt: null } },
    { new: true }
  );
  if (!user) throw new Error('User not found');
  return user;
}

export async function checkPlanExpiry(userId: string): Promise<void> {
  await UserModel.updateOne(
    { _id: userId, plan: { $ne: null }, planExpiresAt: { $lte: new Date() } },
    { $set: { plan: null, planExpiresAt: null, credits: 0 } }
  );
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const result = await UserModel.updateOne(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } }
  );
  return result.modifiedCount > 0;
}
