import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { env } from '~/config/env';
import { UserModel, IUserDocument, IRefreshSession } from '~/models/user.model';
import { AuthCodeModel } from '~/models/authCode.model';
import { IUser, IAuthResponse } from '@voca/shared';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

// Pin the algorithm so a token can never pick its own verification scheme.
const JWT_ALGORITHM = 'HS256';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10;
const AUTH_CODE_TTL_MS = 2 * 60 * 1000;

export function toIUser(doc: IUserDocument): IUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    avatarUrl: doc.avatarUrl,
    provider: doc.provider,
    credits: doc.credits,
    plan: doc.plan,
    currentPeriodEnd: doc.currentPeriodEnd?.toISOString() ?? null,
    subscriptionStatus: doc.subscriptionStatus,
    cancelScheduled: doc.cancelScheduled ?? false,
    createdAt: doc.createdAt.toISOString(),
  };
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: '15m' });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: REFRESH_TTL_MS / 1000, jwtid: crypto.randomUUID() });
}

function newSession(refreshToken: string, now: Date): IRefreshSession {
  return { hash: hashToken(refreshToken), expiresAt: new Date(now.getTime() + REFRESH_TTL_MS), createdAt: now };
}

// Pipeline expression: live sessions (minus the one being rotated) + the new one, newest MAX_SESSIONS kept.
// Rotated sessions move to the end, so the cap evicts the least recently used device.
function sessionsWith(session: IRefreshSession, now: Date, replaceHash: string | null = null) {
  return {
    $slice: [
      {
        $concatArrays: [
          {
            $filter: {
              input: { $ifNull: ['$refreshTokens', []] },
              cond: { $and: [{ $gt: ['$$this.expiresAt', now] }, { $ne: ['$$this.hash', replaceHash] }] },
            },
          },
          { $literal: [session] },
        ],
      },
      -MAX_SESSIONS,
    ],
  };
}

export async function upsertGoogleUser(authCode: string, redirectUri: string): Promise<IUserDocument> {
  const { tokens } = await googleClient.getToken({ code: authCode, redirect_uri: redirectUri });
  const idToken = tokens.id_token;
  if (!idToken) throw new Error('No ID token received from Google');

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google ID token');
  }

  return UserModel.findOneAndUpdate(
    { provider: 'google', providerId: payload.sub },
    {
      $set: {
        email: payload.email.trim().slice(0, 254),
        name: (payload.name || payload.email).trim().slice(0, 100),
        avatarUrl: payload.picture,
      },
      $setOnInsert: {
        provider: 'google',
        providerId: payload.sub,
        plan: 'max',
        credits: 3,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true }
  ).orFail();
}

/** Starts a new device session for the user. */
export async function issueTokens(user: IUserDocument): Promise<IAuthResponse> {
  const userId = user._id.toString();
  const refreshToken = signRefreshToken(userId);
  const now = new Date();

  const result = await UserModel.updateOne(
    { _id: user._id },
    [{ $set: { refreshTokens: sessionsWith(newSession(refreshToken, now), now) } }]
  );
  if (result.matchedCount === 0) throw new Error('User not found');

  return { user: toIUser(user), token: signAccessToken(userId, user.email), refreshToken };
}

export class InvalidAuthCodeError extends Error {
  constructor() {
    super('Invalid auth code');
  }
}

/** Returns a one-time code bound to the app's PKCE challenge; only its hash is stored. */
export async function createAuthCode(userId: Types.ObjectId, challenge: string): Promise<string> {
  const code = crypto.randomBytes(32).toString('base64url');
  await AuthCodeModel.create({
    codeHash: hashToken(code),
    userId,
    challenge,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });
  return code;
}

export async function exchangeAuthCode(code: string, verifier: string): Promise<IAuthResponse> {
  // Delete-on-read makes the code single-use, even when the verifier turns out wrong.
  const entry = await AuthCodeModel.findOneAndDelete({ codeHash: hashToken(code), expiresAt: { $gt: new Date() } });
  if (!entry) throw new InvalidAuthCodeError();

  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  if (!safeEqual(entry.challenge, challenge)) throw new InvalidAuthCodeError();

  const user = await UserModel.findById(entry.userId);
  if (!user) throw new InvalidAuthCodeError();
  return issueTokens(user);
}

export function verifyToken(token: string): { sub: string; email: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { sub: string; email?: string; type?: string };
  // Refresh tokens share the secret; without this they would work as 7-day access tokens.
  if (decoded.type || !decoded.email) throw new Error('Invalid access token');
  return { sub: decoded.sub, email: decoded.email };
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}

// Legacy single-session field from before multi-device sessions.
// Removable once those refresh tokens have expired (7 days after deploy).
async function migrateLegacySession(userId: string, hash: string, session: IRefreshSession, now: Date) {
  const user = await UserModel.findById(userId).select('+refreshToken');
  if (!user?.refreshToken || !safeEqual(user.refreshToken, hash)) return null;

  return UserModel.findOneAndUpdate(
    { _id: userId, refreshToken: user.refreshToken },
    [{ $set: { refreshTokens: sessionsWith(session, now) } }, { $unset: 'refreshToken' }],
    { new: true }
  );
}

export async function refreshAccessToken(rt: string): Promise<IAuthResponse> {
  let decoded: { sub: string; type: string };
  try {
    decoded = jwt.verify(rt, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { sub: string; type: string };
  } catch {
    throw new InvalidRefreshTokenError();
  }
  if (decoded.type !== 'refresh' || !Types.ObjectId.isValid(decoded.sub)) throw new InvalidRefreshTokenError();

  const now = new Date();
  const hash = hashToken(rt);
  const newRefreshToken = signRefreshToken(decoded.sub);
  const session = newSession(newRefreshToken, now);

  // Conditioned on the presented session still existing, so a refresh token is single-use even under concurrent requests.
  const rotated =
    (await UserModel.findOneAndUpdate(
      { _id: decoded.sub, refreshTokens: { $elemMatch: { hash, expiresAt: { $gt: now } } } },
      [{ $set: { refreshTokens: sessionsWith(session, now, hash) } }],
      { new: true }
    )) ?? (await migrateLegacySession(decoded.sub, hash, session, now));
  if (!rotated) throw new InvalidRefreshTokenError();

  return { user: toIUser(rotated), token: signAccessToken(decoded.sub, rotated.email), refreshToken: newRefreshToken };
}

/** Signs out one device, or every device when no refresh token is given (old app versions). */
export async function revokeSessions(userId: string, refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    await UserModel.updateOne({ _id: userId }, { $set: { refreshTokens: [] }, $unset: { refreshToken: 1 } });
    return;
  }
  const hash = hashToken(refreshToken);
  await Promise.all([
    UserModel.updateOne({ _id: userId }, { $pull: { refreshTokens: { hash } } }),
    // Legacy single-session field; removable with migrateLegacySession
    UserModel.updateOne({ _id: userId, refreshToken: hash }, { $unset: { refreshToken: 1 } }),
  ]);
}
