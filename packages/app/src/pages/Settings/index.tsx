import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import { IUserSettings } from '@voca/shared';
import { api, ApiError } from '~/lib/axios';
import { applyRemoteSettings } from '~/stores/auth.store';
import { ProviderSelect } from '~/components/ProviderSelect';
import { LanguageSelect } from '~/components/LanguageSelect';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { TranslationSettings } from '~/components/TranslationSettings';
import { VocabularySettings } from '~/components/VocabularySettings';
import { NoiseSuppression } from '~/components/NoiseSuppression';
import { EchoCancellation } from '~/components/EchoCancellation';
import { PrivacyMode } from '~/components/PrivacyMode';
import { LaunchAtLogin } from '~/components/LaunchAtLogin';
import { DirectTyping } from '~/components/DirectTyping';
import { LiveTyping } from '~/components/LiveTyping';
import { ShortcutSettings } from '~/components/ShortcutSettings';
import { useShortcutStore } from '~/stores/shortcut.store';
import { useOnboardingStore } from '~/stores/onboarding.store';

export const SettingsView = () => {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);
  const resetShortcuts = useShortcutStore((s) => s.reset);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await api.post<IUserSettings>('/auth/settings/reset');
      if (res.data) applyRemoteSettings(res.data);
      await resetShortcuts();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 pb-20 space-y-4">
      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.speech')}</h3>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <label className="text-xs text-[#737373]">{t('settings.provider')}</label>
              <ProviderSelect />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#737373]">{t('settings.language')}</label>
              <LanguageSelect />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#737373]">{t('settings.microphone')}</label>
            <MicrophoneSelect />
          </div>
          <LiveTyping />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">{t('settings.translation')}</h3>
          <TranslationSettings />
        </CardContent>
      </Card>

      <VocabularySettings />

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.preferences')}</h3>
          <NoiseSuppression />
          <div className="border-t border-dashed border-slate-200" />
          <EchoCancellation />
          <div className="border-t border-dashed border-slate-200" />
          <PrivacyMode />
          <LaunchAtLogin />
          <DirectTyping />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.shortcuts')}</h3>
          <ShortcutSettings />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? t('settings.resetting') : t('settings.resetDefaults')}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetOnboarding} className="text-[#737373]">
          {t('onboarding.showAgain')}
        </Button>
      </div>
    </div>
  );
};
