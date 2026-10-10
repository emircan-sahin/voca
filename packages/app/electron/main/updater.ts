import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { autoUpdater } from 'electron-updater';

export function initAutoUpdater(
  mainWindow: BrowserWindow,
  onBeforeInstall: () => void,
  isFromMainWindow: (e: IpcMainInvokeEvent) => boolean
) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-available', { version: info.version });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:download-progress', { percent: progress.percent });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err.message);
  });

  ipcMain.handle('updater:check', async (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('[updater] Check failed:', err);
    }
  });

  ipcMain.handle('updater:download', async (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      console.error('[updater] Download failed:', err);
      // Let the renderer drop its "downloading" toast instead of spinning forever
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('updater:error');
    }
  });

  ipcMain.handle('updater:install', (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    // macOS closes every window before before-quit fires; the hide-on-close handler would swallow that
    onBeforeInstall();
    setImmediate(() => autoUpdater.quitAndInstall());
  });

  // Periodic check every hour
  setInterval(
    () => autoUpdater.checkForUpdates().catch((err) => console.warn('[updater] Periodic check failed:', err.message ?? err)),
    60 * 60 * 1_000
  );
}
