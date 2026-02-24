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

const sections = [
  { label: 'Transcription Provider', component: <ProviderSelect /> },
  { label: 'Language', component: <LanguageSelect /> },
  { label: 'Microphone', component: <MicrophoneSelect /> },
  { label: 'Audio Processing', component: <NoiseSuppression /> },
  { label: 'Translation', component: <TranslationSettings /> },
  { label: 'Privacy', component: <PrivacyMode /> },
];

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
      {sections.map((section) => (
        <Card key={section.label} variant="bordered" className="border-solid border-[#e5e5e5]">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-[#171717] mb-3">{section.label}</h3>
            {section.component}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-start">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Resetting...' : 'Reset to Defaults'}
        </Button>
      </div>
    </div>
  );
};
