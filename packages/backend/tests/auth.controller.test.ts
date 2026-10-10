import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import i18nextMiddleware from 'i18next-http-middleware';
import i18n from '~/i18n/config';
import { UserModel } from '~/models/user.model';
import { googleRedirect, googleCallback, exchange } from '~/controllers/auth.controller';
import { asyncHandler } from '~/utils/asyncHandler';

vi.mock('~/config/env', () => ({
  env: {
    JWT_SECRET: 'test_secret_that_is_at_least_32_characters_long',
    GOOGLE_CLIENT_ID: 'client',
    GOOGLE_CLIENT_SECRET: 'secret',
    BASE_URL: 'http://localhost:3100/api',
  },
}));

// Pulls in the STT SDKs, which need API keys at import time
vi.mock('~/controllers/transcript.controller', () => ({ deleteUserTranscripts: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    getToken = async () => ({ tokens: { id_token: 'id-token' } });
    verifyIdToken = async () => ({
      getPayload: () => ({ sub: 'google-sub-1', email: 'pkce@example.com', name: 'PKCE User' }),
    });
  },
}));

function buildApp() {
  const app = express();
  app.use(i18nextMiddleware.handle(i18n));
  app.use(express.json());
  app.get('/auth/google', googleRedirect);
  app.get('/auth/google/callback', asyncHandler(googleCallback));
  app.post('/auth/exchange', asyncHandler(exchange));
  return app;
}

const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

/** Runs the browser half of the flow and returns the voca:// deep link the callback page fires. */
async function signInThroughBrowser(app: express.Express, query: string) {
  const start = await request(app).get(`/auth/google${query}`);
  expect(start.status).toBe(302);
  const state = new URL(start.headers.location).searchParams.get('state');
  const cookies = ([] as string[]).concat(start.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]);

  const cb = await request(app)
    .get(`/auth/google/callback?code=google-code&state=${state}`)
    .set('Cookie', cookies.join('; '));
  expect(cb.status).toBe(200);
  const deepLink = cb.text.match(/"(voca:\/\/auth\/callback\?[^"]+)"/)?.[1];
  expect(deepLink).toBeDefined();
  return new URL(deepLink!);
}

describe('Google OAuth deep link', () => {
  it('rejects a malformed code_challenge', async () => {
    const res = await request(buildApp()).get('/auth/google?code_challenge=short');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('with a challenge, deep-links a one-time code that only the verifier can exchange', async () => {
    const app = buildApp();
    const link = await signInThroughBrowser(app, `?code_challenge=${challenge}`);

    expect(link.searchParams.has('token')).toBe(false);
    expect(link.searchParams.has('refreshToken')).toBe(false);
    const code = link.searchParams.get('code')!;
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // No session is created until the code is exchanged
    const before = await UserModel.findOne({ providerId: 'google-sub-1' }).select('+refreshTokens');
    expect(before!.refreshTokens).toHaveLength(0);

    const res = await request(app).post('/auth/exchange').send({ code, verifier });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('pkce@example.com');
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('refreshTokens');

    const again = await request(app).post('/auth/exchange').send({ code, verifier });
    expect(again.status).toBe(401);
    expect(again.body).toEqual({ success: false, message: i18n.t('auth.invalidAuthCode'), data: null });
  });

  it('rejects an exchange with the wrong verifier', async () => {
    const app = buildApp();
    const link = await signInThroughBrowser(app, `?code_challenge=${challenge}`);

    const res = await request(app)
      .post('/auth/exchange')
      .send({ code: link.searchParams.get('code'), verifier: crypto.randomBytes(32).toString('base64url') });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed exchange body', async () => {
    const res = await request(buildApp()).post('/auth/exchange').send({ code: 'x' });
    expect(res.status).toBe(400);
  });

  it('without a challenge (old app versions), still deep-links tokens', async () => {
    const link = await signInThroughBrowser(buildApp(), '');

    expect(link.searchParams.has('code')).toBe(false);
    expect(link.searchParams.get('token')).toEqual(expect.any(String));
    expect(link.searchParams.get('refreshToken')).toEqual(expect.any(String));
    const user = await UserModel.findOne({ providerId: 'google-sub-1' }).select('+refreshTokens');
    expect(user!.refreshTokens).toHaveLength(1);
  });
});
