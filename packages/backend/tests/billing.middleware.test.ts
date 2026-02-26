import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserModel } from '~/models/user.model';
import { requireCredits } from '~/middleware/billing.middleware';

// Mock Paddle SDK
vi.mock('~/config/paddle', () => ({
  paddle: { subscriptions: { cancel: vi.fn() } },
}));

vi.mock('~/config/env', () => ({
  env: {
    PADDLE_PRICE_PRO: 'pri_test_pro',
    PADDLE_PRICE_MAX: 'pri_test_max',
  },
}));

function buildApp(userId: string) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: userId, email: 'test@example.com' };
    next();
  });
  app.post('/test', requireCredits, (_req, res) => {
    res.json({ success: true, message: 'OK', data: null });
  });
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

describe('requireCredits middleware', () => {
  it('should pass when user has plan and credits', async () => {
    const user = await createUser({ plan: 'pro', credits: 2.0, subscriptionStatus: 'active' });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(200);
  });

  it('should 402 when user has no plan (free user)', async () => {
    const user = await createUser({ plan: null, credits: 0 });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/active plan required/i);
  });

  it('should 402 when credits are zero', async () => {
    const user = await createUser({ plan: 'pro', credits: 0, subscriptionStatus: 'active' });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/insufficient credits/i);
  });

  it('should pass trialing user with credits', async () => {
    const user = await createUser({ plan: 'pro', credits: 0.5, subscriptionStatus: 'trialing' });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(200);
  });

  it('should 402 for trialing user with zero credits', async () => {
    const user = await createUser({ plan: 'pro', credits: 0, subscriptionStatus: 'trialing' });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/insufficient credits/i);
  });

  it('should 402 for canceled user (plan=null after webhook)', async () => {
    const user = await createUser({
      plan: null,
      credits: 0,
      subscriptionStatus: 'canceled',
    });
    const app = buildApp(user._id.toString());

    const res = await request(app).post('/test');
    expect(res.status).toBe(402);
  });

  it('should 404 when user not found', async () => {
    const app = buildApp('000000000000000000000000');

    const res = await request(app).post('/test');
    expect(res.status).toBe(404);
  });
});
