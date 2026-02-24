import { useState } from 'react';
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

export const SettingsView = () => {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.post<IUserSettings>('/auth/settings/reset');
      if (res.data) applyRemoteSettings(res.data);
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
          <h3 className="text-sm font-medium text-[#171717]">Speech</h3>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <label className="text-xs text-[#737373]">Provider</label>
              <ProviderSelect />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#737373]">Language</label>
              <LanguageSelect />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#737373]">Microphone</label>
            <MicrophoneSelect />
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">Translation</h3>
          <TranslationSettings />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[#171717]">Preferences</h3>
          <NoiseSuppression />
          <div className="border-t border-dashed border-slate-200" />
          <PrivacyMode />
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Resetting...' : 'Reset to Defaults'}
        </Button>
      </div>
    </div>
  );
};
