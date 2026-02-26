import { app, safeStorage, shell } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';

interface AuthData {
  token: string;
  refreshToken: string;
}

const canEncrypt = () => safeStorage.isEncryptionAvailable();
const getStorePath = () =>
  join(app.getPath('userData'), canEncrypt() ? 'auth.bin' : 'auth.json');

export function getAuthData(): AuthData | null {
  try {
    const path = getStorePath();
    if (!existsSync(path)) return null;
    const raw = canEncrypt()
      ? safeStorage.decryptString(readFileSync(path))
      : readFileSync(path, 'utf-8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthData(data: AuthData): void {
  const json = JSON.stringify(data);
  if (canEncrypt()) {
    writeFileSync(getStorePath(), safeStorage.encryptString(json));
  } else {
    writeFileSync(getStorePath(), json, { encoding: 'utf-8', mode: 0o600 });
  }
}

export function clearAuthData(): void {
  try { unlinkSync(getStorePath()); } catch {}
}

export function openAuthProvider(url: string): void {
  shell.openExternal(url);
}
