import { useEffect, useRef } from 'react';
import { useAuthStore, remoteSettingsVersion } from '~/stores/auth.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useProgramLanguageStore } from '~/stores/programLanguage.store';
import { useTranslationStore } from '~/stores/translation.store';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';
import { useEchoCancellationStore } from '~/stores/echoCancellation.store';
import { usePrivacyModeStore } from '~/stores/privacyMode.store';
import { api } from '~/lib/axios';
import { queryClient } from '~/lib/queryClient';
import { TRANSCRIPTS_QUERY_KEY } from '~/hooks/useTranscription';

export function useSettingsSync() {
  const user = useAuthStore((s) => s.user);
  const settingsHydrated = useAuthStore((s) => s.settingsHydrated);
  const provider = useProviderStore((s) => s.provider);
  const language = useLanguageStore((s) => s.language);
  const programLanguage = useProgramLanguageStore((s) => s.programLanguage);
  const { enabled, targetLanguage, tone, numeric, planning } = useTranslationStore();
  const noiseSuppression = useNoiseSuppressionStore((s) => s.enabled);
  const echoCancellation = useEchoCancellationStore((s) => s.enabled);
  const privacyMode = usePrivacyModeStore((s) => s.enabled);

  // Tracks the last remoteSettingsVersion we saw, so we can skip syncing
  // server-driven changes (hydration, reset) back to the server.
  const lastRemoteVersion = useRef(remoteSettingsVersion);
  // Privacy mode as the server last stored it: only its off→on switch wipes server transcripts
  const savedPrivacyMode = useRef(privacyMode);

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
      savedPrivacyMode.current = privacyMode;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .put('/auth/settings', {
          provider,
          language,
          programLanguage,
          noiseSuppression,
          echoCancellation,
          privacyMode,
          translation: { enabled, targetLanguage, tone, numeric, planning },
        }, { signal: controller.signal })
        .then(() => {
          // Any later save must leave the cache alone: it is the only copy of privacy-mode transcripts
          if (privacyMode && !savedPrivacyMode.current) queryClient.resetQueries({ queryKey: TRANSCRIPTS_QUERY_KEY });
          savedPrivacyMode.current = privacyMode;
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
  }, [user, settingsHydrated, provider, language, programLanguage, noiseSuppression, echoCancellation, privacyMode, enabled, targetLanguage, tone, numeric, planning]);
}
