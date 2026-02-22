import { useCallback, useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Card, CardContent, Button } from 'poyraz-ui/atoms';

const recordingKey = window.electronAPI.platform === 'darwin' ? 'Right ⌘' : 'Right ⊞';

const shortcuts = [
  { action: 'Start / Stop Recording', keys: [recordingKey] },
  { action: 'Show Shortcuts', keys: ['?'] },
];

export const ShortcutsPanel = () => {
  const [open, setOpen] = useState(false);

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
      {/* Trigger button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard size={18} />
      </Button>

      {/* Panel overlay */}
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
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#171717]">Keyboard Shortcuts</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="h-6 w-6"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Shortcuts list */}
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
