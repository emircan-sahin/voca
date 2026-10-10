import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import i18nextMiddleware from 'i18next-http-middleware';
import i18n from '~/i18n/config';
import { UserModel } from '~/models/user.model';
import { requireDailyQuota } from '~/middleware/quota.middleware';
import { recordAudioUsage, utcDay } from '~/services/usage.service';
import { asyncHandler } from '~/utils/asyncHandler';

// 10-minute daily cap → 600 seconds
vi.mock('~/config/env', () => ({
  env: { DAILY_AUDIO_LIMIT_MINUTES: 10 },
}));

function buildApp(userId: string) {
  const app = express();
  app.use(i18nextMiddleware.handle(i18n));
  app.use((req, _res, next) => {
    req.user = { id: userId, email: 'test@example.com' };
    next();
  });
  app.post('/test', asyncHandler(requireDailyQuota), (_req, res) => {
    res.json({ success: true, message: 'OK', data: null });
  });
  return app;
}

let userCounter = 0;
async function createUser(overrides = {}) {
  userCounter++;
  return UserModel.create({
    email: `quota${userCounter}@example.com`,
    name: 'Test User',
    provider: 'google',
    providerId: `google_quota_${userCounter}`,
    ...overrides,
  });
}

describe('requireDailyQuota middleware', () => {
  it('should pass a user with no usage recorded yet', async () => {
    const user = await createUser();
    const res = await request(buildApp(user._id.toString())).post('/test');
    expect(res.status).toBe(200);
  });

  it('should pass when under today\'s limit', async () => {
    const user = await createUser({ usageDay: utcDay(), usageSeconds: 599 });
    const res = await request(buildApp(user._id.toString())).post('/test');
    expect(res.status).toBe(200);
  });

  it('should 429 when today\'s limit is reached', async () => {
    const user = await createUser({ usageDay: utcDay(), usageSeconds: 600 });
    const res = await request(buildApp(user._id.toString())).post('/test');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/daily transcription limit/i);
  });

  it('should pass when the usage over the limit is from a previous day', async () => {
    const user = await createUser({ usageDay: '2000-01-01', usageSeconds: 99_999 });
    const res = await request(buildApp(user._id.toString())).post('/test');
    expect(res.status).toBe(200);
  });
});

describe('recordAudioUsage', () => {
  it('should start counting for a user with no usage', async () => {
    const user = await createUser();
    await recordAudioUsage(user._id.toString(), 12.5);

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.usageDay).toBe(utcDay());
    expect(updated!.usageSeconds).toBeCloseTo(12.5);
  });

  it('should add to today\'s usage', async () => {
    const user = await createUser({ usageDay: utcDay(), usageSeconds: 100 });
    await recordAudioUsage(user._id.toString(), 30);

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.usageSeconds).toBeCloseTo(130);
  });

  it('should reset the count on a new day', async () => {
    const user = await createUser({ usageDay: '2000-01-01', usageSeconds: 5000 });
    await recordAudioUsage(user._id.toString(), 40);

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.usageDay).toBe(utcDay());
    expect(updated!.usageSeconds).toBeCloseTo(40);
  });

  it('should count concurrent recordings atomically', async () => {
    const user = await createUser({ usageDay: '2000-01-01', usageSeconds: 5000 });
    const id = user._id.toString();
    await Promise.all(Array.from({ length: 10 }, () => recordAudioUsage(id, 10)));

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.usageSeconds).toBeCloseTo(100);
  });

  it('should not throw when the update fails', async () => {
    await expect(recordAudioUsage('not-an-object-id', 10)).resolves.toBeUndefined();
  });
});
