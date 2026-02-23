import { app, shell } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';

interface AuthData {
  token: string;
  refreshToken: string;
}

const getStorePath = () => join(app.getPath('userData'), 'auth.json');

export function getAuthData(): AuthData | null {
  try {
    const path = getStorePath();
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf-8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthData(data: AuthData): void {
  writeFileSync(getStorePath(), JSON.stringify(data), 'utf-8');
}

export function clearAuthData(): void {
  try {
    unlinkSync(getStorePath());
  } catch {
    // file doesn't exist, ignore
  }
}

export function openAuthProvider(url: string): void {
  shell.openExternal(url);
}
