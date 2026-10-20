import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';
import { useLiveTypingStore } from '~/stores/liveTyping.store';
import { useProviderStore } from '~/stores/provider.store';
import { useTranslationStore } from '~/stores/translation.store';

export const LiveTyping = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useLiveTypingStore();
  const provider = useProviderStore((s) => s.provider);

  // Only Deepgram streams, and Linux has no way to type into another app
  if (provider !== 'deepgram' || window.electronAPI.platform === 'linux') return null;

  const handleChange = (checked: boolean) => {
    setEnabled(checked);
    // Translation needs the whole sentence, so the two can't both run
    if (checked) useTranslationStore.getState().setEnabled(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="live-typing-toggle" className="text-sm cursor-pointer">
          {t('settings.liveTyping')}
        </Label>
        <Switch id="live-typing-toggle" checked={enabled} onCheckedChange={handleChange} />
      </div>
      <p className="text-xs leading-relaxed text-[#737373]">{t('settings.liveTypingDesc')}</p>
    </div>
  );
};
