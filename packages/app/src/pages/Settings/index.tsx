import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import { IUserSettings } from '@voca/shared';
import { api } from '~/lib/axios';
import { applyRemoteSettings } from '~/stores/auth.store';
import { ProviderSelect } from '~/components/ProviderSelect';
import { LanguageSelect } from '~/components/LanguageSelect';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { TranslationSettings } from '~/components/TranslationSettings';
import { NoiseSuppression } from '~/components/NoiseSuppression';
import { PrivacyMode } from '~/components/PrivacyMode';
import { ShortcutSettings } from '~/components/ShortcutSettings';
import { useShortcutStore } from '~/stores/shortcut.store';

export const SettingsView = () => {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);
  const resetShortcuts = useShortcutStore((s) => s.reset);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.post<IUserSettings>('/auth/settings/reset');
      if (res.data) applyRemoteSettings(res.data);
      await resetShortcuts();
    } catch {
      // Settings reset failed — ignore
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
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
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">{t('settings.translation')}</h3>
          <TranslationSettings />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.preferences')}</h3>
          <NoiseSuppression />
          <div className="border-t border-dashed border-slate-200" />
          <PrivacyMode />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.shortcuts')}</h3>
          <ShortcutSettings />
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? t('settings.resetting') : t('settings.resetDefaults')}
        </Button>
      </div>
    </div>
  );
};
