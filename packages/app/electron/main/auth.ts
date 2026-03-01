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
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(salt), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);

  const final = Buffer.concat([salt, iv, cipher.getAuthTag(), encrypted]);
  writeFileSync(getStorePath(), final, { mode: 0o600 });
}

export function clearAuthData(): void {
  try { unlinkSync(getStorePath()); } catch {}
}

export function openAuthProvider(url: string): void {
  shell.openExternal(url);
}
