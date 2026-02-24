import { useEffect, useRef } from 'react';
import { useAuthStore, remoteSettingsVersion } from '~/stores/auth.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useTranslationStore } from '~/stores/translation.store';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';
import { usePrivacyModeStore } from '~/stores/privacyMode.store';
import { api } from '~/lib/axios';
import { queryClient } from '~/lib/queryClient';

export function useSettingsSync() {
  const user = useAuthStore((s) => s.user);
  const settingsHydrated = useAuthStore((s) => s.settingsHydrated);
  const provider = useProviderStore((s) => s.provider);
  const language = useLanguageStore((s) => s.language);
  const { enabled, targetLanguage, tone, numeric, planning } = useTranslationStore();
  const noiseSuppression = useNoiseSuppressionStore((s) => s.enabled);
  const privacyMode = usePrivacyModeStore((s) => s.enabled);

  // Tracks the last remoteSettingsVersion we saw, so we can skip syncing
  // server-driven changes (hydration, reset) back to the server.
  const lastRemoteVersion = useRef(remoteSettingsVersion);

  // Reset version tracking when user changes (logout/login)
  useEffect(() => {
    if (!user) lastRemoteVersion.current = 0;
  }, [user]);

  useEffect(() => {
    // Block sync until server settings are successfully loaded.
    // This prevents local defaults from overwriting the database
    // when the settings fetch fails or hasn't completed yet.
    if (!user || !settingsHydrated) return;

    // Skip when settings came from the server (hydration or reset)
    if (lastRemoteVersion.current !== remoteSettingsVersion) {
      lastRemoteVersion.current = remoteSettingsVersion;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .put('/auth/settings', {
          provider,
          language,
          noiseSuppression,
          privacyMode,
          translation: { enabled, targetLanguage, tone, numeric, planning },
        }, { signal: controller.signal })
        .then(() => {
          if (privacyMode) queryClient.invalidateQueries({ queryKey: ['transcripts'] });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.warn('[SettingsSync] Failed to save settings:', err.message ?? err);
        });
    }, 1000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [user, settingsHydrated, provider, language, noiseSuppression, privacyMode, enabled, targetLanguage, tone, numeric, planning]);
}
