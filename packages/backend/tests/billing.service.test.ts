import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserModel } from '~/models/user.model';
import { handleSubscriptionEvent, cancelSubscription, deductCredits } from '~/services/billing.service';

// Mock Paddle SDK — prevent real API calls
vi.mock('~/config/paddle', () => ({
  paddle: {
    subscriptions: {
      cancel: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock env with test price IDs
vi.mock('~/config/env', () => ({
  env: {
    PADDLE_PRICE_PRO: 'pri_test_pro',
    PADDLE_PRICE_MAX: 'pri_test_max',
  },
}));

let userCounter = 0;
async function createUser(overrides = {}) {
  userCounter++;
  return UserModel.create({
    email: `test${userCounter}@example.com`,
    name: 'Test User',
    provider: 'google',
    providerId: `google_test_${userCounter}`,
    ...overrides,
  });
}

// ── handleSubscriptionEvent ──────────────────────────────────────

describe('handleSubscriptionEvent', () => {
  describe('new subscription (trialing)', () => {
    it('should set plan, trial credits, and trialing status', async () => {
      const user = await createUser();

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'trialing',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-04-01T00:00:00Z',
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.plan).toBe('pro');
      expect(updated!.subscriptionStatus).toBe('trialing');
      expect(updated!.credits).toBe(0.5); // TRIAL_CREDITS.pro
      expect(updated!.paddleSubscriptionId).toBe('sub_001');
      expect(updated!.paddleCustomerId).toBe('ctm_001');
      expect(updated!.cancelScheduled).toBe(false);
    });

    it('should grant max trial credits for max plan', async () => {
      const user = await createUser();

      await handleSubscriptionEvent({
        subscriptionId: 'sub_002',
        customerId: 'ctm_001',
        status: 'trialing',
        priceId: 'pri_test_max',
        currentPeriodEnd: '2026-04-01T00:00:00Z',
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.plan).toBe('max');
      expect(updated!.credits).toBe(1.5); // TRIAL_CREDITS.max
    });
  });

  describe('trial → active transition (first payment)', () => {
    it('should grant full plan credits', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'trialing',
        paddleSubscriptionId: 'sub_001',
        credits: 0.2, // partially used trial credits
      });

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-05-01T00:00:00Z',
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.subscriptionStatus).toBe('active');
      expect(updated!.credits).toBe(3); // PLAN_CREDITS.pro (replaces trial remainder)
    });
  });

  describe('renewal (period advanced)', () => {
    it('should grant credits when billing period advances', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'active',
        paddleSubscriptionId: 'sub_001',
        currentPeriodEnd: new Date('2026-04-01'),
        credits: 0.5,
      });

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-05-01T00:00:00Z', // advanced
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.credits).toBe(3); // fresh PLAN_CREDITS
    });

    it('should NOT grant credits when period has not advanced', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'active',
        paddleSubscriptionId: 'sub_001',
        currentPeriodEnd: new Date('2026-05-01'),
        credits: 1.5,
      });

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-05-01T00:00:00Z', // same period
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.credits).toBe(1.5); // unchanged
    });
  });

  describe('plan upgrade (pro → max)', () => {
    it('should grant new plan credits on upgrade', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'active',
        paddleSubscriptionId: 'sub_001',
        currentPeriodEnd: new Date('2026-05-01'),
        credits: 1.0,
      });

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_max', // upgraded to max
        currentPeriodEnd: '2026-05-01T00:00:00Z',
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.plan).toBe('max');
      expect(updated!.credits).toBe(10); // PLAN_CREDITS.max
    });
  });

  describe('canceled', () => {
    it('should reset user to free state', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'active',
        paddleSubscriptionId: 'sub_001',
        paddleCustomerId: 'ctm_001',
        credits: 2.5,
        currentPeriodEnd: new Date('2026-05-01'),
        cancelScheduled: true,
      });

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'canceled',
        priceId: '', // canceled events may have empty priceId
        currentPeriodEnd: null,
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.plan).toBeNull();
      expect(updated!.credits).toBe(0);
      expect(updated!.currentPeriodEnd).toBeNull();
      expect(updated!.subscriptionStatus).toBe('canceled');
      expect(updated!.cancelScheduled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should skip if user not found', async () => {
      // Should not throw
      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-05-01T00:00:00Z',
        userId: '000000000000000000000000',
      });
    });

    it('should skip if priceId is unknown (non-canceled)', async () => {
      const user = await createUser();

      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_unknown',
        currentPeriodEnd: '2026-05-01T00:00:00Z',
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.plan).toBeNull(); // unchanged
    });

    it('should NOT reset cancelScheduled on normal subscription.updated', async () => {
      const user = await createUser({
        plan: 'pro',
        subscriptionStatus: 'active',
        paddleSubscriptionId: 'sub_001',
        currentPeriodEnd: new Date('2026-05-01'),
        cancelScheduled: true,
        credits: 2.0,
      });

      // subscription.updated fires when cancel is scheduled — same period, same plan
      await handleSubscriptionEvent({
        subscriptionId: 'sub_001',
        customerId: 'ctm_001',
        status: 'active',
        priceId: 'pri_test_pro',
        currentPeriodEnd: '2026-05-01T00:00:00Z', // same period
        userId: user._id.toString(),
      });

      const updated = await UserModel.findById(user._id);
      expect(updated!.cancelScheduled).toBe(true); // preserved
    });
  });
});

// ── cancelSubscription ───────────────────────────────────────────

describe('cancelSubscription', () => {
  it('should set cancelScheduled and call Paddle API', async () => {
    const { paddle } = await import('~/config/paddle');
    const user = await createUser({
      paddleSubscriptionId: 'sub_001',
      subscriptionStatus: 'active',
      cancelScheduled: false,
    });

    await cancelSubscription(user._id.toString());

    const updated = await UserModel.findById(user._id);
    expect(updated!.cancelScheduled).toBe(true);
    expect(paddle.subscriptions.cancel).toHaveBeenCalledWith('sub_001', {
      effectiveFrom: 'next_billing_period',
    });
  });

  it('should throw if no subscription', async () => {
    const user = await createUser();
    await expect(cancelSubscription(user._id.toString()))
      .rejects.toThrow('No active subscription');
  });

  it('should throw if already scheduled', async () => {
    const user = await createUser({
      paddleSubscriptionId: 'sub_001',
      cancelScheduled: true,
    });
    await expect(cancelSubscription(user._id.toString()))
      .rejects.toThrow('Cancellation already scheduled');
  });
});

// ── deductCredits ────────────────────────────────────────────────

describe('deductCredits', () => {
  it('should deduct when sufficient credits', async () => {
    const user = await createUser({ credits: 2.0, plan: 'pro' });

    const ok = await deductCredits(user._id.toString(), 0.5);
    expect(ok).toBe(true);

    const updated = await UserModel.findById(user._id);
    expect(updated!.credits).toBeCloseTo(1.5);
  });

  it('should reject when insufficient credits', async () => {
    const user = await createUser({ credits: 0.1, plan: 'pro' });

    const ok = await deductCredits(user._id.toString(), 0.5);
    expect(ok).toBe(false);

    const updated = await UserModel.findById(user._id);
    expect(updated!.credits).toBeCloseTo(0.1); // unchanged
  });

  it('should reject when credits are exactly zero', async () => {
    const user = await createUser({ credits: 0, plan: 'pro' });

    const ok = await deductCredits(user._id.toString(), 0.01);
    expect(ok).toBe(false);
  });
});
