import { app, safeStorage, shell } from 'electron';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

interface AuthData {
  token: string;
  refreshToken: string;
}

const getStorePath = () => join(app.getPath('userData'), 'auth.bin');

export function getAuthData(): AuthData | null {
  try {
    const path = getStorePath();
    if (!existsSync(path)) return null;
    const buffer = readFileSync(path);
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buffer)
      : Buffer.from(buffer.toString(), 'base64').toString();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function setAuthData(data: AuthData): void {
  const json = JSON.stringify(data);
  const content = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json).toString('base64');
  writeFileSync(getStorePath(), content, { mode: 0o600 });
}

export function clearAuthData(): void {
  try { unlinkSync(getStorePath()); } catch {}
}

export function openAuthProvider(url: string): void {
  shell.openExternal(url);
}
