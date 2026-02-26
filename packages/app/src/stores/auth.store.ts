import { create } from 'zustand';
import { IUser, IUserSettings } from '@voca/shared';
import { api } from '~/lib/axios';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useProgramLanguageStore } from '~/stores/programLanguage.store';
import { useTranslationStore } from '~/stores/translation.store';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';
import { usePrivacyModeStore } from '~/stores/privacyMode.store';

interface AuthState {
  user: IUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  settingsHydrated: boolean;
  setAuth: (data: { user: IUser; token: string; refreshToken: string }) => void;
  setTokens: (data: { token: string; refreshToken: string }) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

// Incremented each time the server pushes settings; useSettingsSync reads this
// to avoid syncing server-driven changes back to the server.
export let remoteSettingsVersion = 0;

export function applyRemoteSettings(settings: IUserSettings) {
  remoteSettingsVersion++;
  useProviderStore.setState({ provider: settings.provider });
  useLanguageStore.setState({ language: settings.language });
  if (settings.programLanguage) {
    useProgramLanguageStore.getState().setProgramLanguage(settings.programLanguage);
  }
  useNoiseSuppressionStore.setState({ enabled: settings.noiseSuppression });
  usePrivacyModeStore.setState({ enabled: settings.privacyMode });
  useTranslationStore.setState({
    enabled: settings.translation.enabled,
    targetLanguage: settings.translation.targetLanguage,
    tone: settings.translation.tone,
    numeric: settings.translation.numeric,
    planning: settings.translation.planning,
  });
}

export function refreshUser() {
  api.get<IUser>('/auth/me').then((res) => {
    if (res.data) useAuthStore.setState({ user: res.data });
  }).catch((err) => console.warn('[Auth] Failed to refresh user:', err.message ?? err));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  settingsHydrated: false,
  setAuth: ({ user, token, refreshToken }) => {
    set({ user, token, refreshToken });
    window.electronAPI.auth.set({ token, refreshToken });
  },
  setTokens: ({ token, refreshToken }) => {
    set({ token, refreshToken });
    window.electronAPI.auth.set({ token, refreshToken });
  },
  clearAuth: () => {
    set({ user: null, token: null, refreshToken: null, settingsHydrated: false });
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

    let settingsLoaded = false;
    try {
      // Fetch user from server (interceptor handles refresh on 401)
      const meRes = await api.get<IUser>('/auth/me');
      if (meRes.data) set({ user: meRes.data });

      // Fetch and apply remote settings
      try {
        const settingsRes = await api.get<IUserSettings>('/auth/settings');
        if (settingsRes.data) {
          applyRemoteSettings(settingsRes.data);
          settingsLoaded = true;

          if (!settingsRes.data.programLanguageDefault) {
            const detected = useProgramLanguageStore.getState().programLanguage;
            api.put('/auth/settings', { programLanguageDefault: detected })
              .catch((err) => console.warn('[Auth] Failed to save programLanguageDefault:', err.message ?? err));
          }
        }
      } catch {
        // Settings fetch failed — keep settingsHydrated false to prevent
        // syncing local defaults back to the server
      }
    } catch {
      // Token invalid and refresh failed — interceptor already cleared auth
    }

    set({ isLoading: false, settingsHydrated: settingsLoaded });
  },
}));
