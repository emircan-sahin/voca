import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '~/config/env';
import { UserModel, IUserDocument } from '~/models/user.model';
import { IUser, IAuthResponse } from '@voca/shared';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

export function toIUser(doc: IUserDocument): IUser {
  return {
    id: (doc._id as unknown as { toString(): string }).toString(),
    email: doc.email,
    name: doc.name,
    avatarUrl: doc.avatarUrl,
    provider: doc.provider,
    createdAt: doc.createdAt.toISOString(),
  };
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, { expiresIn: '7d' });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_SECRET, { expiresIn: '30d' });
}

export async function loginWithGoogleCode(authCode: string, redirectUri: string): Promise<IAuthResponse> {
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

  const user = await UserModel.findOneAndUpdate(
    { provider: 'google', providerId: payload.sub },
    {
      email: payload.email,
      name: payload.name || payload.email,
      avatarUrl: payload.picture,
      provider: 'google',
      providerId: payload.sub,
    },
    { upsert: true, new: true }
  );

  const userId = (user._id as unknown as { toString(): string }).toString();
  const token = signAccessToken(userId, user.email);
  const refreshToken = signRefreshToken(userId);

  user.refreshToken = refreshToken;
  await user.save();

  return { user: toIUser(user), token, refreshToken };
}

export function verifyToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string };
}

export async function refreshAccessToken(rt: string): Promise<IAuthResponse> {
  const decoded = jwt.verify(rt, env.JWT_SECRET) as { sub: string; type: string };
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');

  const user = await UserModel.findById(decoded.sub);
  if (!user || user.refreshToken !== rt) {
    throw new Error('Invalid refresh token');
  }

  const newAccessToken = signAccessToken(decoded.sub, user.email);
  const newRefreshToken = signRefreshToken(decoded.sub);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { user: toIUser(user), token: newAccessToken, refreshToken: newRefreshToken };
}

// Pending auth sessions: state → auth data (null = still waiting)
const pendingSessions = new Map<string, { data: IAuthResponse | null; expiresAt: number }>();

export function createPendingSession(state: string): void {
  pendingSessions.set(state, { data: null, expiresAt: Date.now() + 5 * 60_000 }); // 5 min
}

export function completePendingSession(state: string, data: IAuthResponse): void {
  const entry = pendingSessions.get(state);
  if (entry) entry.data = data;
}

export function pollPendingSession(state: string): IAuthResponse | null | 'pending' {
  const entry = pendingSessions.get(state);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pendingSessions.delete(state);
    return null;
  }
  if (!entry.data) return 'pending';
  const data = entry.data;
  pendingSessions.delete(state);
  return data;
}
