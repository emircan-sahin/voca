import { Request, Response } from 'express';
import { env } from '~/config/env';
import {
  loginWithGoogleCode,
  refreshAccessToken,
  toIUser,
} from '~/services/auth.service';
import { UserModel } from '~/models/user.model';
import { sendSuccess, sendError } from '~/utils/response';
import { refreshBodySchema, updateUserSettingsSchema, DEFAULT_USER_SETTINGS } from '@voca/shared';
import { deleteUserTranscripts } from '~/controllers/transcript.controller';

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

function requireAuthConfig(req: Request, res: Response): boolean {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    sendError(res, req.t('auth.notConfigured'), 501);
    return false;
  }
  return true;
}

export const googleRedirect = (req: Request, res: Response) => {
  if (!requireAuthConfig(req, res)) return;

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
    return sendError(res, req.t('auth.missingCode'), 400);
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
    return sendError(res, req.t('auth.missingRefreshToken'), 400);
  }

  try {
    const data = await refreshAccessToken(parsed.data.refreshToken);
    return sendSuccess(res, req.t('auth.tokenRefreshed'), data);
  } catch {
    return sendError(res, req.t('auth.invalidRefreshToken'), 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  await UserModel.findByIdAndUpdate(req.user!.id, { $unset: { refreshToken: 1 } });
  return sendSuccess(res, req.t('auth.loggedOut'), null);
};

export const getMe = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.id);
  if (!user) return sendError(res, req.t('user.notFound'), 404);
  return sendSuccess(res, req.t('user.fetched'), toIUser(user));
};

export const getSettings = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.id);
  if (!user) return sendError(res, req.t('user.notFound'), 404);
  return sendSuccess(res, req.t('user.settingsFetched'), user.settings);
};

export const updateSettings = async (req: Request, res: Response) => {
  const parsed = updateUserSettingsSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, req.t('user.invalidSettings'), 400);

  const s = parsed.data;

  if (s.privacyMode) {
    const current = await UserModel.findById(req.user!.id).select('settings.privacyMode').lean();
    if (current && !current.settings?.privacyMode) {
      await deleteUserTranscripts(req.user!.id);
    }
  }

  const $set: Record<string, unknown> = {};
  if (s.provider !== undefined) $set['settings.provider'] = s.provider;
  if (s.language !== undefined) $set['settings.language'] = s.language;
  if (s.programLanguage !== undefined) $set['settings.programLanguage'] = s.programLanguage;
  if (s.programLanguageDefault !== undefined) $set['settings.programLanguageDefault'] = s.programLanguageDefault;
  if (s.noiseSuppression !== undefined) $set['settings.noiseSuppression'] = s.noiseSuppression;
  if (s.privacyMode !== undefined) $set['settings.privacyMode'] = s.privacyMode;
  if (s.translation) {
    const t = s.translation;
    if (t.enabled !== undefined) $set['settings.translation.enabled'] = t.enabled;
    if (t.targetLanguage !== undefined) $set['settings.translation.targetLanguage'] = t.targetLanguage;
    if (t.tone !== undefined) $set['settings.translation.tone'] = t.tone;
    if (t.numeric !== undefined) $set['settings.translation.numeric'] = t.numeric;
    if (t.planning !== undefined) $set['settings.translation.planning'] = t.planning;
  }

  if (Object.keys($set).length === 0) {
    return sendError(res, req.t('user.noSettingsToUpdate'), 400);
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set },
    { new: true }
  );
  if (!user) return sendError(res, req.t('user.notFound'), 404);
  return sendSuccess(res, req.t('user.settingsUpdated'), user.settings);
};

export const resetSettings = async (req: Request, res: Response) => {
  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set: { settings: DEFAULT_USER_SETTINGS } },
    { new: true }
  );
  if (!user) return sendError(res, req.t('user.notFound'), 404);
  return sendSuccess(res, req.t('user.settingsReset'), user.settings);
};
