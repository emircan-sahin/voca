import { useTranslation } from 'react-i18next';
import { Switch, Label } from 'poyraz-ui/atoms';
import { useDirectTypingStore } from '~/stores/directTyping.store';

export const DirectTyping = () => {
  const { t } = useTranslation();
  const { enabled, toggle } = useDirectTypingStore();

  // Only the macOS helper can type without the clipboard
  if (window.electronAPI.platform !== 'darwin') return null;

  return (
    <>
      <div className="border-t border-dashed border-slate-200" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="direct-typing-toggle" className="text-sm cursor-pointer">
            {t('settings.directTyping')}
          </Label>
          <Switch id="direct-typing-toggle" checked={enabled} onCheckedChange={() => toggle()} />
        </div>
        <p className="text-xs leading-relaxed text-[#737373]">{t('settings.directTypingDesc')}</p>
      </div>
    </>
  );
};
