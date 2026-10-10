import { app, shell } from 'electron';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { machineIdSync } from 'node-machine-id';

interface AuthData {
  token: string;
  refreshToken: string;
}

const ALGORITHM = 'aes-256-gcm';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = SALT_LEN + IV_LEN + TAG_LEN;
const APP_SALT = Buffer.from('dm9jYV9zYWx0XzIwMjY=', 'base64').toString();

const getStorePath = () => join(app.getPath('userData'), 'auth.bin');

function deriveKey(salt: Buffer): Buffer {
  const secret = machineIdSync(true) + APP_SALT + app.getName();
  return crypto.scryptSync(secret, salt, 32);
}

export function getAuthData(): AuthData | null {
  const path = getStorePath();
  if (!existsSync(path)) return null;

  try {
    const buf = readFileSync(path);
    if (buf.length < HEADER_LEN + 1) throw new Error('corrupt');

    const salt = buf.subarray(0, SALT_LEN);
    const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
    const tag = buf.subarray(SALT_LEN + IV_LEN, HEADER_LEN);
    const encrypted = buf.subarray(HEADER_LEN);

    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(salt), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(decrypted);
  } catch {
    try { unlinkSync(path); } catch {}
    return null;
  }
}

export function setAuthData(data: AuthData): void {
  if (!data || typeof data.token !== 'string' || typeof data.refreshToken !== 'string') {
    throw new Error('Invalid auth data');
  }
  const { token, refreshToken } = data;
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(salt), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ token, refreshToken }), 'utf8'),
    cipher.final(),
  ]);

  const final = Buffer.concat([salt, iv, cipher.getAuthTag(), encrypted]);
  writeFileSync(getStorePath(), final, { mode: 0o600 });
}

export function clearAuthData(): void {
  try { unlinkSync(getStorePath()); } catch {}
}

// PKCE (RFC 8252/7636): the deep link carries a one-time code that only this process's verifier can
// redeem, so a voca:// link fired by any other page can't sign the user into someone else's account.
const LOGIN_TTL_MS = 15 * 60_000;
let pendingLogin: { verifier: string; expiresAt: number } | null = null;

export const hasPendingLogin = () => !!pendingLogin && Date.now() < pendingLogin.expiresAt;

/** Hands out the verifier once; a stale or already-used login yields null. */
export function takePendingVerifier(): string | null {
  const verifier = hasPendingLogin() ? pendingLogin!.verifier : null;
  pendingLogin = null;
  return verifier;
}

export function openAuthProvider(url: unknown): void {
  if (typeof url !== 'string') return;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return;
  }
  if (!['http:', 'https:'].includes(target.protocol)) return;

  const verifier = crypto.randomBytes(32).toString('base64url');
  target.searchParams.set('code_challenge', crypto.createHash('sha256').update(verifier).digest('base64url'));
  pendingLogin = { verifier, expiresAt: Date.now() + LOGIN_TTL_MS };
  shell.openExternal(target.toString()).catch((err) => console.warn('[Auth] openExternal failed:', err.message ?? err));
}
