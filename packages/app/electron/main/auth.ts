import { shell } from 'electron';
import Store from 'electron-store';

interface AuthData {
  token: string;
  refreshToken: string;
}

const store = new Store<{ auth: AuthData }>({
  name: 'auth',
  encryptionKey: 'voca-safe-storage',
});

export function getAuthData(): AuthData | null {
  try {
    return store.get('auth') ?? null;
  } catch {
    return null;
  }
}

export function setAuthData(data: AuthData): void {
  store.set('auth', data);
}

export function clearAuthData(): void {
  store.delete('auth');
}

export function openAuthProvider(url: string): void {
  shell.openExternal(url);
}
