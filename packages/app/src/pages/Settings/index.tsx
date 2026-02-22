import { Card, CardContent } from 'poyraz-ui/atoms';
import { ProviderSelect } from '~/components/ProviderSelect';
import { LanguageSelect } from '~/components/LanguageSelect';
import { MicrophoneSelect } from '~/components/MicrophoneSelect';

export const SettingsView = () => {
  return (
    <div className="p-6 space-y-4">
      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">Transcription Provider</h3>
          <ProviderSelect />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">Language</h3>
          <LanguageSelect />
        </CardContent>
      </Card>

      <Card variant="bordered" className="border-solid border-[#e5e5e5]">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-[#171717] mb-3">Microphone</h3>
          <MicrophoneSelect />
        </CardContent>
      </Card>
    </div>
  );
};
