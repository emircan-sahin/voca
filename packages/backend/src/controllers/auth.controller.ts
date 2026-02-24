import { Request, Response } from 'express';
import { env } from '~/config/env';
import {
  loginWithGoogleCode,
  refreshAccessToken,
  toIUser,
} from '~/services/auth.service';
import { UserModel } from '~/models/user.model';
import { sendSuccess, sendError } from '~/utils/response';
import { refreshBodySchema, userSettingsSchema, DEFAULT_USER_SETTINGS } from '@voca/shared';

const REDIRECT_URI = `http://localhost:${env.PORT}/api/auth/google/callback`;

function htmlPage(title: string, subtitle: string, color = '#171717') {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voca</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa">
<div style="text-align:center">
  <p style="font-size:18px;color:${color}">${title}</p>
  <p style="font-size:14px;color:#737373">${subtitle}</p>
</div>
</body></html>`;
}

function requireAuthConfig(res: Response): boolean {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.JWT_SECRET.length < 32) {
    sendError(res, 'Auth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and JWT_SECRET (min 32 chars).', 501);
    return false;
  }
  return true;
}

export const googleRedirect = (_req: Request, res: Response) => {
  if (!requireAuthConfig(res)) return;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  if (typeof code !== 'string') {
    return sendError(res, 'Missing authorization code', 400);
  }

  try {
    const authResponse = await loginWithGoogleCode(code, REDIRECT_URI);
    const deepLinkParams = new URLSearchParams({
      token: authResponse.token,
      refreshToken: authResponse.refreshToken,
    });
    const deepLink = `voca://auth/callback?${deepLinkParams}`;
    return res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voca</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa">
<div style="text-align:center">
  <p style="font-size:18px;color:#171717">Redirecting to Voca...</p>
  <p id="msg" style="font-size:14px;color:#737373">Please wait.</p>
</div>
<script>
  window.location.href = ${JSON.stringify(deepLink)};
  setTimeout(function() { window.close(); }, 500);
  setTimeout(function() {
    document.getElementById('msg').textContent = 'You can close this tab.';
  }, 1000);
</script>
</body></html>`);
  } catch (err) {
    console.error('[Auth] Google callback error:', (err as Error).message);
    return res.status(401).send(htmlPage('Authentication failed', 'Please close this tab and try again.', '#dc2626'));
  }
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
  const user = await UserModel.findById(req.user!.id);
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'User fetched', toIUser(user));
};

export const getSettings = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.id);
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'Settings fetched', user.settings);
};

export const updateSettings = async (req: Request, res: Response) => {
  const parsed = userSettingsSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid settings', 400);

  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set: { settings: parsed.data } },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'Settings updated', user.settings);
};

export const resetSettings = async (req: Request, res: Response) => {
  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set: { settings: DEFAULT_USER_SETTINGS } },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'Settings reset to defaults', user.settings);
};
