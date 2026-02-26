import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';
import { usePrivacyModeStore } from '~/stores/privacyMode.store';

export const PrivacyMode = () => {
  const { t } = useTranslation();
  const { enabled, toggle } = usePrivacyModeStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="privacy-mode-toggle" className="text-sm cursor-pointer">
          {t('settings.privacyMode')}
        </Label>
        <Switch
          id="privacy-mode-toggle"
          checked={enabled}
          onCheckedChange={() => toggle()}
        />
      </div>

      <p className="text-xs text-[#737373] leading-relaxed">
        {t('settings.privacyModeDesc')}
      </p>
    </div>
  );
};
