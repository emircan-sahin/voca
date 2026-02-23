import { create } from 'zustand';
import { IUser, IUserSettings } from '@voca/shared';
import { api } from '~/lib/axios';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useTranslationStore } from '~/stores/translation.store';

interface AuthState {
  user: IUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (data: { user: IUser; token: string; refreshToken: string }) => void;
  setTokens: (data: { token: string; refreshToken: string }) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

function applyRemoteSettings(settings: IUserSettings) {
  useProviderStore.setState({ provider: settings.provider });
  useLanguageStore.setState({ language: settings.language });
  useTranslationStore.setState({
    enabled: settings.translation.enabled,
    targetLanguage: settings.translation.targetLanguage,
    tone: settings.translation.tone,
    numeric: settings.translation.numeric,
    planning: settings.translation.planning,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  setAuth: ({ user, token, refreshToken }) => {
    set({ user, token, refreshToken });
    window.electronAPI.auth.set({ token, refreshToken });
  },
  setTokens: ({ token, refreshToken }) => {
    set({ token, refreshToken });
    window.electronAPI.auth.set({ token, refreshToken });
  },
  clearAuth: () => {
    set({ user: null, token: null, refreshToken: null });
    window.electronAPI.auth.clear();
  },
  hydrate: async () => {
    const stored = await window.electronAPI.auth.get();
    if (!stored) {
      set({ isLoading: false });
      return;
    }

    // Set tokens so interceptor can attach Bearer header
    set({ token: stored.token, refreshToken: stored.refreshToken });

    try {
      // Fetch user from server (interceptor handles refresh on 401)
      const meRes = await api.get<IUser>('/auth/me');
      if (meRes.data) set({ user: meRes.data });

      // Fetch and apply remote settings
      try {
        const settingsRes = await api.get<IUserSettings>('/auth/settings');
        if (settingsRes.data) applyRemoteSettings(settingsRes.data);
      } catch {
        // Settings fetch failed — use local settings
      }
    } catch {
      // Token invalid and refresh failed — interceptor already cleared auth
    }

    set({ isLoading: false });
  },
}));
