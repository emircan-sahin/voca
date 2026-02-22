import { useCallback, useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

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
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/80 text-gray-400 backdrop-blur-sm border border-gray-700/50 hover:text-white hover:bg-gray-700/80 transition-colors"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard size={18} />
      </button>

      {/* Panel overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-80 rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="flex flex-col gap-3">
              {shortcuts.map((s) => (
                <div key={s.action} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-gray-800 border border-gray-600/50 px-1.5 text-xs font-medium text-gray-300"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
