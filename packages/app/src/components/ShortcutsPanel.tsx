import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';
import { useShortcutStore } from '~/stores/shortcut.store';
import { formatKeyLabel } from '~/components/ShortcutSettings';

export const ShortcutsPanel = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const config = useShortcutStore((s) => s.config);
  const load = useShortcutStore((s) => s.load);

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  const shortcuts = [
    ...(config?.['toggle-recording']?.enabled
      ? [{ action: t('shortcuts.startStop'), keys: [formatKeyLabel(config['toggle-recording'].label)] }]
      : []),
    ...(config?.['cancel-recording']?.enabled
      ? [{ action: t('shortcuts.cancel'), keys: [formatKeyLabel(config['cancel-recording'].label)] }]
      : []),
    { action: t('shortcuts.show'), keys: ['?'] },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }

      if (
        e.key === '?' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setOpen((prev) => !prev);
      }
    },
    [open]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40"
        aria-label={t('shortcuts.title')}
      >
        <Keyboard size={18} />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5"
          onClick={() => setOpen(false)}
        >
          <Card
            variant="bordered"
            className="w-80 bg-white"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#171717]">{t('shortcuts.title')}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label={t('common.cancel')}
                  className="h-6 w-6"
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {shortcuts.map((s) => (
                  <div key={s.action} className="flex items-center justify-between">
                    <span className="text-sm text-[#171717]">{s.action}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex h-6 min-w-[24px] items-center justify-center border border-dashed border-[#e5e5e5] px-1.5 text-xs font-medium text-[#737373]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
