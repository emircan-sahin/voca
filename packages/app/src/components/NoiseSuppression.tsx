import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';

export const NoiseSuppression = () => {
  const { t } = useTranslation();
  const { enabled, toggle } = useNoiseSuppressionStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="noise-suppression-toggle" className="text-sm cursor-pointer">
          {t('settings.noiseSuppression')}
        </Label>
        <Switch
          id="noise-suppression-toggle"
          checked={enabled}
          onCheckedChange={() => toggle()}
        />
      </div>

      <p className="text-xs text-[#737373] leading-relaxed">
        {t('settings.noiseSuppressionDesc')}
        <br />
        {t('settings.noiseSuppressionHint')}
      </p>
    </div>
  );
};
