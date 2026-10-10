import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';

// The OS owns this setting, so read it back instead of mirroring it in a store
export const LaunchAtLogin = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    window.electronAPI.loginItem.get().then(setEnabled).catch((err) => console.warn('[LaunchAtLogin]', err.message ?? err));
  }, []);

  const handleChange = (checked: boolean) => {
    window.electronAPI.loginItem.set(checked).then(setEnabled).catch((err) => console.warn('[LaunchAtLogin]', err.message ?? err));
  };

  // Electron cannot register login items on Linux
  if (window.electronAPI.platform === 'linux') return null;

  // Fragment so the divider disappears together with the row on Linux
  return (
    <>
      <div className="border-t border-dashed border-slate-200" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="launch-at-login-toggle" className="text-sm cursor-pointer">
            {t('settings.launchAtLogin')}
          </Label>
          <Switch id="launch-at-login-toggle" checked={enabled} onCheckedChange={handleChange} />
        </div>
        <p className="text-xs leading-relaxed text-[#737373]">{t('settings.launchAtLoginDesc')}</p>
      </div>
    </>
  );
};
