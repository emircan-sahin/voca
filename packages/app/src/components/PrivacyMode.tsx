import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Label, Button } from 'poyraz-ui/atoms';
import { usePrivacyModeStore } from '~/stores/privacyMode.store';

export const PrivacyMode = () => {
  const { t } = useTranslation();
  const { enabled, toggle } = usePrivacyModeStore();
  const [confirming, setConfirming] = useState(false);

  // Enabling wipes all existing transcripts, so it needs an explicit confirmation.
  const handleChange = () => {
    if (enabled) {
      toggle();
    } else {
      setConfirming(true);
    }
  };

  const handleConfirm = () => {
    setConfirming(false);
    toggle();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="privacy-mode-toggle" className="text-sm cursor-pointer">
          {t('settings.privacyMode')}
        </Label>
        <Switch
          id="privacy-mode-toggle"
          checked={enabled}
          onCheckedChange={handleChange}
        />
      </div>

      <p className={`text-xs leading-relaxed ${confirming ? 'text-red-600' : 'text-[#737373]'}`}>
        {t('settings.privacyModeDesc')}
      </p>

      {confirming && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            {t('common.delete')}
          </Button>
        </div>
      )}
    </div>
  );
};
