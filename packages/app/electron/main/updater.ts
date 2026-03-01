import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

export function initAutoUpdater(mainWindow: BrowserWindow) {
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

  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('[updater] Check failed:', err);
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      console.error('[updater] Download failed:', err);
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Periodic check every hour
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 60 * 60 * 1_000);
}
