import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel } from '~/models/user.model';
import {
  verifyToken,
  refreshAccessToken,
  issueTokens,
  revokeSessions,
  createAuthCode,
  exchangeAuthCode,
  toIUser,
  InvalidRefreshTokenError,
  InvalidAuthCodeError,
} from '~/services/auth.service';
import { AuthCodeModel } from '~/models/authCode.model';

const SECRET = 'test_secret_that_is_at_least_32_characters_long';

vi.mock('~/config/env', () => ({
  env: {
    JWT_SECRET: 'test_secret_that_is_at_least_32_characters_long',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  },
}));

const sha256 = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

const challengeOf = (verifier: string) => crypto.createHash('sha256').update(verifier).digest('base64url');

function createUser() {
  return UserModel.create({
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    providerId: `google_${crypto.randomUUID()}`,
  });
}

async function sessionsOf(userId: unknown) {
  const doc = await UserModel.findById(userId).select('+refreshToken +refreshTokens');
  return { legacy: doc!.refreshToken, sessions: doc!.refreshTokens };
}

// Pre multi-device shape: one hash in the legacy refreshToken field
async function createUserWithRefreshToken() {
  const user = await UserModel.create({
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    providerId: `google_${crypto.randomUUID()}`,
  });
  const rt = jwt.sign({ sub: user._id.toString(), type: 'refresh' }, SECRET, { expiresIn: '7d', jwtid: crypto.randomUUID() });
  await UserModel.updateOne({ _id: user._id }, { $set: { refreshToken: sha256(rt) } });
  return { user, rt };
}

describe('verifyToken', () => {
  it('accepts an HS256 access token', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.c' }, SECRET, { algorithm: 'HS256' });
    expect(verifyToken(token)).toEqual({ sub: 'u1', email: 'a@b.c' });
  });

  it('rejects a refresh token used as an access token', async () => {
    const { rt } = await createUserWithRefreshToken();
    expect(() => verifyToken(rt)).toThrow();
  });

  it('rejects a token signed with a different algorithm', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.c' }, SECRET, { algorithm: 'HS512' });
    expect(() => verifyToken(token)).toThrow();
  });
});

describe('refreshAccessToken', () => {
  it('rotates the refresh token and makes the old one single-use', async () => {
    const { refreshToken: rt } = await issueTokens(await createUser());

    const first = await refreshAccessToken(rt);
    expect(first.refreshToken).not.toBe(rt);
    expect(verifyToken(first.token).email).toBe('test@example.com');

    await expect(refreshAccessToken(rt)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(first.refreshToken)).resolves.toBeDefined();
  });

  it('allows only one of two concurrent refreshes with the same token', async () => {
    const { refreshToken: rt } = await issueTokens(await createUser());

    const results = await Promise.allSettled([refreshAccessToken(rt), refreshAccessToken(rt)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('allows only one of two concurrent refreshes with the same legacy token', async () => {
    const { rt } = await createUserWithRefreshToken();

    const results = await Promise.allSettled([refreshAccessToken(rt), refreshAccessToken(rt)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('rejects an access token used as a refresh token', async () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.c' }, SECRET);
    await expect(refreshAccessToken(token)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });
});

describe('multi-device sessions', () => {
  it('lets two devices refresh independently', async () => {
    const user = await createUser();
    const a = await issueTokens(user);
    const b = await issueTokens(user);

    const a2 = await refreshAccessToken(a.refreshToken);
    const b2 = await refreshAccessToken(b.refreshToken);
    await expect(refreshAccessToken(a2.refreshToken)).resolves.toBeDefined();
    await expect(refreshAccessToken(b2.refreshToken)).resolves.toBeDefined();
    expect((await sessionsOf(user._id)).sessions).toHaveLength(2);
  });

  it('logging out one device keeps the other signed in', async () => {
    const user = await createUser();
    const a = await issueTokens(user);
    const b = await issueTokens(user);

    await revokeSessions(user._id.toString(), a.refreshToken);

    await expect(refreshAccessToken(a.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(b.refreshToken)).resolves.toBeDefined();
  });

  it('logout without a refresh token revokes every session, legacy included', async () => {
    const { user, rt: legacyRt } = await createUserWithRefreshToken();
    const a = await issueTokens(user);

    await revokeSessions(user._id.toString());

    await expect(refreshAccessToken(a.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(legacyRt)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('migrates a legacy single-token user on the first refresh', async () => {
    const { user, rt } = await createUserWithRefreshToken();

    const next = await refreshAccessToken(rt);

    const { legacy, sessions } = await sessionsOf(user._id);
    expect(legacy).toBeUndefined();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].hash).toBe(sha256(next.refreshToken));
    await expect(refreshAccessToken(rt)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(next.refreshToken)).resolves.toBeDefined();
  });

  it('caps sessions at 10, evicting the oldest', async () => {
    const user = await createUser();
    const issued = [];
    for (let i = 0; i < 12; i++) issued.push(await issueTokens(user));

    expect((await sessionsOf(user._id)).sessions).toHaveLength(10);
    await expect(refreshAccessToken(issued[0].refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(issued[1].refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(refreshAccessToken(issued[2].refreshToken)).resolves.toBeDefined();
  });

  it('drops expired sessions when a new one is added', async () => {
    const user = await createUser();
    const old = new Date(Date.now() - 1000);
    await UserModel.updateOne({ _id: user._id }, { $set: { refreshTokens: [{ hash: 'stale', expiresAt: old, createdAt: old }] } });

    await issueTokens(user);

    const { sessions } = await sessionsOf(user._id);
    expect(sessions.map((s) => s.hash)).not.toContain('stale');
    expect(sessions).toHaveLength(1);
  });

  it('never loads or exposes session hashes by default', async () => {
    const user = await createUser();
    await issueTokens(user);

    const doc = await UserModel.findById(user._id);
    expect(doc!.toObject()).not.toHaveProperty('refreshTokens');
    expect(JSON.stringify(toIUser(doc!))).not.toContain('refreshToken');
  });

  it('saving a document loaded without sessions keeps them', async () => {
    const user = await createUser();
    const { refreshToken } = await issueTokens(user);

    const doc = await UserModel.findById(user._id);
    doc!.name = 'Renamed';
    await doc!.save();

    await expect(refreshAccessToken(refreshToken)).resolves.toBeDefined();
  });
});

describe('auth code exchange (PKCE)', () => {
  const verifier = crypto.randomBytes(32).toString('base64url');

  it('exchanges a code with the right verifier for a new session', async () => {
    const user = await createUser();
    const code = await createAuthCode(user._id, challengeOf(verifier));
    expect(await AuthCodeModel.countDocuments({ codeHash: code })).toBe(0); // only the hash is stored

    const res = await exchangeAuthCode(code, verifier);

    expect(verifyToken(res.token).sub).toBe(user._id.toString());
    expect(res.user.email).toBe('test@example.com');
    await expect(refreshAccessToken(res.refreshToken)).resolves.toBeDefined();
  });

  it('rejects a wrong verifier and burns the code', async () => {
    const user = await createUser();
    const code = await createAuthCode(user._id, challengeOf(verifier));

    await expect(exchangeAuthCode(code, crypto.randomBytes(32).toString('base64url'))).rejects.toBeInstanceOf(InvalidAuthCodeError);
    await expect(exchangeAuthCode(code, verifier)).rejects.toBeInstanceOf(InvalidAuthCodeError);
    expect((await sessionsOf(user._id)).sessions).toHaveLength(0);
  });

  it('is single-use', async () => {
    const user = await createUser();
    const code = await createAuthCode(user._id, challengeOf(verifier));

    await exchangeAuthCode(code, verifier);
    await expect(exchangeAuthCode(code, verifier)).rejects.toBeInstanceOf(InvalidAuthCodeError);
  });

  it('allows only one of two concurrent exchanges', async () => {
    const user = await createUser();
    const code = await createAuthCode(user._id, challengeOf(verifier));

    const results = await Promise.allSettled([exchangeAuthCode(code, verifier), exchangeAuthCode(code, verifier)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('rejects an expired code', async () => {
    const user = await createUser();
    const code = await createAuthCode(user._id, challengeOf(verifier));
    await AuthCodeModel.updateOne({ codeHash: sha256(code) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(exchangeAuthCode(code, verifier)).rejects.toBeInstanceOf(InvalidAuthCodeError);
  });
});
