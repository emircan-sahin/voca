import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';
import { useEchoCancellationStore } from '~/stores/echoCancellation.store';

export const EchoCancellation = () => {
  const { t } = useTranslation();
  const { enabled, toggle } = useEchoCancellationStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="echo-cancellation-toggle" className="text-sm cursor-pointer">
          {t('settings.echoCancellation')}
        </Label>
        <Switch
          id="echo-cancellation-toggle"
          checked={enabled}
          onCheckedChange={() => toggle()}
        />
      </div>

      <p className="text-xs text-[#737373] leading-relaxed">
        {t('settings.echoCancellationDesc')}
        <br />
        {t('settings.echoCancellationHint')}
      </p>
    </div>
  );
};
