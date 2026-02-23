import { Card, CardContent } from 'poyraz-ui/atoms';
import { ProviderSelect } from '~/components/ProviderSelect';
import { LanguageSelect } from '~/components/LanguageSelect';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';
import { TranslationSettings } from '~/components/TranslationSettings';
import { NoiseSuppression } from '~/components/NoiseSuppression';

const sections = [
  { label: 'Transcription Provider', component: <ProviderSelect /> },
  { label: 'Language', component: <LanguageSelect /> },
  { label: 'Microphone', component: <MicrophoneSelect /> },
  { label: 'Audio Processing', component: <NoiseSuppression /> },
  { label: 'Translation', component: <TranslationSettings /> },
];

export const SettingsView = () => {
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
    </div>
  );
};
