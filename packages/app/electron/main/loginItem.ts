import { app, ipcMain, IpcMainInvokeEvent } from 'electron';

// Windows has no "open hidden" flag, so the login entry carries an argument instead.
// getLoginItemSettings compares the entry by args, so both calls must pass the same ones.
const options = process.platform === 'win32' ? { args: ['--hidden'] } : {};

export function launchedHidden() {
  const s = app.getLoginItemSettings(options);
  // openAsHidden is ignored on macOS 13+, wasOpenedAtLogin still reports a login launch
  return process.argv.includes('--hidden') || s.wasOpenedAtLogin || s.wasOpenedAsHidden;
}

export function registerLoginItemIpc(isFromMainWindow: (e: IpcMainInvokeEvent) => boolean) {
  ipcMain.handle('loginItem:get', (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    return app.getLoginItemSettings(options).openAtLogin;
  });

  ipcMain.handle('loginItem:set', (e, enabled: unknown) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    if (typeof enabled !== 'boolean') throw new Error('Invalid argument');
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true, ...options });
    return app.getLoginItemSettings(options).openAtLogin;
  });
}
