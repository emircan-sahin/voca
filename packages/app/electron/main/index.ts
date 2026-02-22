import { app, BrowserWindow, shell, ipcMain, systemPreferences, clipboard, nativeImage } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { showOverlay, hideOverlay, sendAudioDataToOverlay } from './overlay';

let mainWin: BrowserWindow | null = null;

// Microphone
ipcMain.handle('permissions:getMicrophoneStatus', () => {
  return systemPreferences.getMediaAccessStatus('microphone');
});

ipcMain.handle('permissions:requestMicrophone', async () => {
  return await systemPreferences.askForMediaAccess('microphone');
});

ipcMain.handle('permissions:openMicrophoneSettings', () => {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  );
});

// Accessibility
ipcMain.handle('permissions:getAccessibilityStatus', () => {
  return systemPreferences.isTrustedAccessibilityClient(false);
});

ipcMain.handle('permissions:openAccessibilitySettings', () => {
  systemPreferences.isTrustedAccessibilityClient(true); // macOS native prompt
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  );
});

// Paste transcript into active app
ipcMain.on('transcript:paste-text', (_event, text: string) => {
  clipboard.writeText(text);
  setTimeout(() => {
    if (process.platform === 'darwin') {
      exec(
        `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
      );
    } else {
      exec(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
      );
    }
  }, 100);
});

// Recording overlay
ipcMain.on('overlay:show', () => {
  const shouldRefocus = !mainWin?.isFocused();
  showOverlay(shouldRefocus, mainWin ?? undefined);
});
ipcMain.on('overlay:hide', () => hideOverlay());
ipcMain.on('overlay:audio-data', (_, data: number[]) => sendAudioDataToOverlay(data));
ipcMain.on('overlay:stop', () => {
  mainWin?.webContents.send('shortcut:toggle-recording');
});

function createWindow() {
  const iconPath = join(__dirname, '../../../../assets/icon.png');

  const win = new BrowserWindow({
    width: 1050,
    height: 740,
    minWidth: 1050,
    minHeight: 740,
    maxWidth: 1050,
    maxHeight: 740,
    resizable: false,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  return win;
}

app.setName('Voca');

app.whenReady().then(() => {
  // Set dock icon on macOS (dev mode uses Electron's default otherwise)
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(
      join(__dirname, '../../../../assets/icon.png')
    );
    app.dock.setIcon(dockIcon);
  }

  mainWin = createWindow();
  registerShortcuts(mainWin);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWin = createWindow();
      registerShortcuts(mainWin);
    }
  });
});

app.on('will-quit', () => {
  unregisterShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
