import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Switch, Label, Button } from 'poyraz-ui/atoms';
import { useShortcutStore } from '~/stores/shortcut.store';

const isMac = window.electronAPI.platform === 'darwin';

const ACTION_I18N: Record<ShortcutAction, string> = {
  'toggle-recording': 'shortcuts.startStop',
  'cancel-recording': 'shortcuts.cancel',
};

export function formatKeyLabel(label: string): string {
  const map: Record<string, string> = {
    MetaRight: isMac ? 'Right ⌘' : 'Right ⊞',
    MetaLeft: isMac ? 'Left ⌘' : 'Left ⊞',
    AltRight: isMac ? 'Right ⌥' : 'Right Alt',
    AltLeft: isMac ? 'Left ⌥' : 'Left Alt',
    CtrlRight: 'Right Ctrl',
    CtrlLeft: 'Left Ctrl',
    ShiftRight: 'Right Shift',
    ShiftLeft: 'Left Shift',
  };
  return map[label] ?? label;
}

export const ShortcutSettings = () => {
  const { t } = useTranslation();
  const { config, loading, load, updateBinding, toggleEnabled } = useShortcutStore();
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
  const capturingRef = useRef(capturing);
  capturingRef.current = capturing;

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!capturing) return;

    const cleanupCaptured = window.electronAPI.shortcuts.onKeyCaptured((data) => {
      const current = capturingRef.current;
      if (!current) return;
      if (config) {
        const conflict = Object.entries(config).find(
          ([action, binding]) => action !== current && binding.keycode === data.keycode,
        );
        if (conflict) {
          toast.error(t('shortcuts.conflict'));
          setCapturing(null);
          return;
        }
      }
      updateBinding(current, { keycode: data.keycode, label: data.label });
      setCapturing(null);
    });

    const cleanupCancelled = window.electronAPI.shortcuts.onCaptureCancelled(() => {
      setCapturing(null);
    });

    return () => { cleanupCaptured(); cleanupCancelled(); };
  }, [capturing, config, updateBinding]);

  const handleStartCapture = useCallback((action: ShortcutAction) => {
    setCapturing(action);
    window.electronAPI.shortcuts.startCapture();
  }, []);

  if (loading || !config) return null;

  const actions = Object.keys(config) as ShortcutAction[];

  return (
    <div className="space-y-3">
      {actions.map((action) => {
        const binding = config[action];
        return (
          <div key={action} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id={`shortcut-${action}`}
                checked={binding.enabled}
                onCheckedChange={() => toggleEnabled(action)}
              />
              <Label htmlFor={`shortcut-${action}`} className="text-sm cursor-pointer">
                {t(ACTION_I18N[action])}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex h-7 min-w-[24px] items-center justify-center border border-dashed border-[#e5e5e5] px-2 text-xs font-medium text-[#737373] rounded">
                {capturing === action ? t('shortcuts.pressKey') : formatKeyLabel(binding.label)}
              </kbd>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartCapture(action)}
                disabled={capturing !== null}
                className="text-xs h-7 px-2"
              >
                {t('shortcuts.change')}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
