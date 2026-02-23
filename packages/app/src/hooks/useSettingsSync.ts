import { useEffect, useRef } from 'react';
import { useAuthStore } from '~/stores/auth.store';
import { useProviderStore } from '~/stores/provider.store';
import { useLanguageStore } from '~/stores/language.store';
import { useTranslationStore } from '~/stores/translation.store';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';
import { api } from '~/lib/axios';

export function useSettingsSync() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const provider = useProviderStore((s) => s.provider);
  const language = useLanguageStore((s) => s.language);
  const { enabled, targetLanguage, tone, numeric, planning } = useTranslationStore();
  const noiseSuppression = useNoiseSuppressionStore((s) => s.enabled);

  const hasSynced = useRef(false);

  // Reset sync flag when user changes (logout/login)
  useEffect(() => {
    if (!user) hasSynced.current = false;
  }, [user]);

  useEffect(() => {
    if (!user || isLoading) return;

    // Skip the first run after hydration (remote settings were just applied)
    if (!hasSynced.current) {
      hasSynced.current = true;
      return;
    }

    const timer = setTimeout(() => {
      api
        .put('/auth/settings', {
          provider,
          language,
          noiseSuppression,
          translation: { enabled, targetLanguage, tone, numeric, planning },
        })
        .catch((err) => {
          console.warn('[SettingsSync] Failed to save settings:', err.message ?? err);
        });
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, isLoading, provider, language, noiseSuppression, enabled, targetLanguage, tone, numeric, planning]);
}
