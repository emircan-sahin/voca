import { useEffect } from 'react';
import toast from 'react-hot-toast';

const TOAST_ID = 'auto-update';

export function useAutoUpdate() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      window.electronAPI.updater.onUpdateAvailable(({ version }) => {
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">Update v{version} available</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.electronAPI.updater.downloadUpdate();
                }}
                className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
              >
                Update
              </button>
            </div>
          ),
          { id: TOAST_ID, duration: Infinity }
        );
      })
    );

    cleanups.push(
      window.electronAPI.updater.onDownloadProgress(({ percent }) => {
        toast.loading(`Downloading update... ${Math.round(percent)}%`, {
          id: TOAST_ID,
        });
      })
    );

    cleanups.push(
      window.electronAPI.updater.onUpdateDownloaded(({ version }) => {
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">v{version} ready to install</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.electronAPI.updater.installUpdate();
                }}
                className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
              >
                Restart
              </button>
            </div>
          ),
          { id: TOAST_ID, duration: Infinity }
        );
      })
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);
}
