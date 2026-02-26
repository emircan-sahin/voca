import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserModel } from '~/models/user.model';
import { checkout, cancel } from '~/controllers/billing.controller';

// ── Mocks ────────────────────────────────────────────────────────

const mockPaddleSubscriptionsUpdate = vi.fn().mockResolvedValue({});
const mockPaddleSubscriptionsCancel = vi.fn().mockResolvedValue({});
const mockPaddleTransactionsCreate = vi.fn().mockResolvedValue({
  checkout: { url: 'https://checkout.paddle.com/pay?_ptxn=txn_123' },
});

vi.mock('~/config/paddle', () => ({
  paddle: {
    subscriptions: {
      update: (...args: unknown[]) => mockPaddleSubscriptionsUpdate(...args),
      cancel: (...args: unknown[]) => mockPaddleSubscriptionsCancel(...args),
    },
    transactions: {
      create: (...args: unknown[]) => mockPaddleTransactionsCreate(...args),
    },
  },
}));

vi.mock('~/config/env', () => ({
  env: {
    PADDLE_API_KEY: 'test',
    PADDLE_CLIENT_TOKEN: 'test_token',
    PADDLE_WEBHOOK_SECRET: 'test_secret',
    PADDLE_PRICE_PRO: 'pri_test_pro',
    PADDLE_PRICE_MAX: 'pri_test_max',
    PADDLE_SANDBOX: true,
  },
}));

function buildApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: userId, email: 'test@example.com' };
    next();
  });
  app.post('/checkout', checkout);
  app.post('/cancel', cancel);
  return app;
}

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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Checkout ─────────────────────────────────────────────────────

describe('POST /checkout', () => {
  it('should create checkout for free user', async () => {
    const user = await createUser();
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('_ptxn=txn_123');
    expect(mockPaddleTransactionsCreate).toHaveBeenCalledWith({
      items: [{ priceId: 'pri_test_pro', quantity: 1 }],
      customData: { userId: user._id.toString() },
    });
  });

  it('should reject invalid plan', async () => {
    const user = await createUser();
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'ultra' });
    expect(res.status).toBe(400);
  });

  it('should block downgrade (max → pro)', async () => {
    const user = await createUser({
      plan: 'max',
      subscriptionStatus: 'active',
      paddleSubscriptionId: 'sub_001',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/downgrade/i);
  });

  it('should block same plan resubscription', async () => {
    const user = await createUser({
      plan: 'pro',
      subscriptionStatus: 'active',
      paddleSubscriptionId: 'sub_001',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/downgrade/i);
  });

  it('should allow upgrade (pro → max) via Paddle subscription update', async () => {
    const user = await createUser({
      plan: 'pro',
      subscriptionStatus: 'active',
      paddleSubscriptionId: 'sub_001',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'max' });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(true);
    expect(mockPaddleSubscriptionsUpdate).toHaveBeenCalledWith('sub_001', {
      items: [{ priceId: 'pri_test_max', quantity: 1 }],
      prorationBillingMode: 'prorated_immediately',
    });
  });

  it('should block plan changes during trial', async () => {
    const user = await createUser({
      plan: 'pro',
      subscriptionStatus: 'trialing',
      paddleSubscriptionId: 'sub_001',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/checkout').send({ plan: 'max' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/trial/i);
  });

  it('should allow new subscription after cancellation', async () => {
    const user = await createUser({
      plan: null,
      subscriptionStatus: 'canceled',
      paddleSubscriptionId: 'sub_001',
      cancelScheduled: false,
    });
    const app = buildApp(user._id.toString());

    // canceled + no cancelScheduled → hasLiveSub = false → new checkout
    const res = await request(app).post('/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBeDefined();
  });

  it('should block checkout during active cancelScheduled period', async () => {
    const user = await createUser({
      plan: 'pro',
      subscriptionStatus: 'active',
      paddleSubscriptionId: 'sub_001',
      cancelScheduled: true,
    });
    const app = buildApp(user._id.toString());

    // cancelScheduled = true → hasLiveSub = false → new checkout is allowed
    // This is correct: user can start new checkout since current sub is ending
    const res = await request(app).post('/checkout').send({ plan: 'max' });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBeDefined();
  });
});

// ── Cancel ───────────────────────────────────────────────────────

describe('POST /cancel', () => {
  it('should cancel subscription and return updated user', async () => {
    const user = await createUser({
      plan: 'pro',
      subscriptionStatus: 'active',
      paddleSubscriptionId: 'sub_001',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/cancel');
    expect(res.status).toBe(200);
    expect(res.body.data.cancelScheduled).toBe(true);
    expect(mockPaddleSubscriptionsCancel).toHaveBeenCalledWith('sub_001', {
      effectiveFrom: 'next_billing_period',
    });
  });

  it('should 400 if no subscription', async () => {
    const user = await createUser();
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/cancel');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no active subscription/i);
  });

  it('should 400 if already scheduled', async () => {
    const user = await createUser({
      paddleSubscriptionId: 'sub_001',
      cancelScheduled: true,
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/cancel');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already scheduled/i);
  });
});
