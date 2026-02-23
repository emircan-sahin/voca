import { Request, Response } from 'express';
import { env } from '~/config/env';
import {
  loginWithGoogleCode,
  refreshAccessToken,
  createPendingSession,
  completePendingSession,
  pollPendingSession,
} from '~/services/auth.service';
import { UserModel } from '~/models/user.model';
import { sendSuccess, sendError } from '~/utils/response';
import { IUser, refreshBodySchema } from '@voca/shared';

const REDIRECT_URI = `http://localhost:${env.PORT}/api/auth/google/callback`;

function requireAuthConfig(res: Response): boolean {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.JWT_SECRET.length < 32) {
    sendError(res, 'Auth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and JWT_SECRET (min 32 chars).', 501);
    return false;
  }
  return true;
}

export const googleRedirect = (req: Request, res: Response) => {
  if (!requireAuthConfig(res)) return;

  const state = req.query.state;
  if (typeof state !== 'string') {
    return sendError(res, 'Missing state parameter', 400);
  }

  createPendingSession(state);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (typeof code !== 'string' || typeof state !== 'string') {
    return sendError(res, 'Missing authorization code or state', 400);
  }

  try {
    const authResponse = await loginWithGoogleCode(code, REDIRECT_URI);
    completePendingSession(state, authResponse);

    return res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voca</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa">
<div style="text-align:center">
  <p style="font-size:18px;color:#171717">Authentication successful!</p>
  <p style="font-size:14px;color:#737373">You can close this tab and return to Voca.</p>
</div>
</body></html>`);
  } catch (err) {
    console.error('[Auth] Google callback error:', (err as Error).message);
    return res.status(401).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voca</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa">
<div style="text-align:center">
  <p style="font-size:18px;color:#dc2626">Authentication failed</p>
  <p style="font-size:14px;color:#737373">Please close this tab and try again.</p>
</div>
</body></html>`);
  }
};

export const poll = (req: Request, res: Response) => {
  const { state } = req.query;
  if (typeof state !== 'string') {
    return sendError(res, 'Missing state parameter', 400);
  }

  const result = pollPendingSession(state);
  if (result === 'pending') {
    return res.status(202).json({ success: true, message: 'Waiting for authentication', data: null });
  }
  if (!result) {
    return sendError(res, 'Session expired or not found', 404);
  }

  return sendSuccess(res, 'Authentication successful', result);
};

export const refresh = async (req: Request, res: Response) => {
  const parsed = refreshBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Missing or invalid refresh token', 400);
  }

  try {
    const data = await refreshAccessToken(parsed.data.refreshToken);
    return sendSuccess(res, 'Token refreshed', data);
  } catch {
    return sendError(res, 'Invalid refresh token', 401);
  }
};

export const getMe = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.id).lean();
  if (!user) return sendError(res, 'User not found', 404);

  const data: IUser = {
    id: (user._id as unknown as { toString(): string }).toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    createdAt: user.createdAt.toISOString(),
  };

  return sendSuccess(res, 'User fetched', data);
};
