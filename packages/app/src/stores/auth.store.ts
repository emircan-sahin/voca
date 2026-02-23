import { create } from 'zustand';
import { IUser } from '@voca/shared';

interface AuthState {
  user: IUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (data: { user: IUser; token: string; refreshToken: string }) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  setAuth: ({ user, token, refreshToken }) => {
    set({ user, token, refreshToken });
    window.electronAPI.auth.set({ token, refreshToken, user });
  },
  clearAuth: () => {
    set({ user: null, token: null, refreshToken: null });
    window.electronAPI.auth.clear();
  },
  hydrate: async () => {
    const data = await window.electronAPI.auth.get();
    if (data) {
      set({ user: data.user as IUser, token: data.token, refreshToken: data.refreshToken });
    }
    set({ isLoading: false });
  },
}));
