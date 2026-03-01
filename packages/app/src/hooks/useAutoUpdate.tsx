import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const TOAST_ID = 'auto-update';

export function useAutoUpdate() {
  const { t } = useTranslation();

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      window.electronAPI.updater.onUpdateAvailable(({ version }) => {
        toast(
          (toastInstance) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">{t('update.available', { version })}</span>
              <button
                onClick={() => {
                  toast.dismiss(toastInstance.id);
                  window.electronAPI.updater.downloadUpdate();
                }}
                className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
              >
                {t('update.button')}
              </button>
            </div>
          ),
          { id: TOAST_ID, duration: Infinity }
        );
      })
    );

    cleanups.push(
      window.electronAPI.updater.onDownloadProgress(({ percent }) => {
        toast.loading(t('update.downloading', { percent: Math.round(percent) }), {
          id: TOAST_ID,
        });
      })
    );

    cleanups.push(
      window.electronAPI.updater.onUpdateDownloaded(({ version }) => {
        toast(
          (toastInstance) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">{t('update.ready', { version })}</span>
              <button
                onClick={() => {
                  toast.dismiss(toastInstance.id);
                  window.electronAPI.updater.installUpdate();
                }}
                className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
              >
                {t('update.restart')}
              </button>
            </div>
          ),
          { id: TOAST_ID, duration: Infinity }
        );
      })
    );

    window.electronAPI.updater.check();

    return () => cleanups.forEach((fn) => fn());
  }, [t]);
}
