import { app, BrowserWindow, screen, shell, ipcMain, systemPreferences, clipboard, nativeImage } from 'electron';
import path, { join } from 'path';
import { exec } from 'child_process';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { showOverlay, hideOverlay, sendLoadingToOverlay } from './overlay';
import { getAuthData, setAuthData, clearAuthData, openAuthProvider } from './auth';
import { initAutoUpdater } from './updater';

// Enable CDP for Playwright MCP in dev mode
if (process.env['ELECTRON_RENDERER_URL']) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

const isDev = !!process.env['ELECTRON_RENDERER_URL'];
const assetsPath = isDev
  ? join(__dirname, '../../../../assets')
  : join(process.resourcesPath, 'assets');

let mainWin: BrowserWindow | null = null;
let bufferedDeepLinkUrl: string | null = null;
let isQuitting = false;

function handleAuthDeepLink(url: string) {
  if (!url.startsWith('voca://auth/callback')) return;

  const parsed = new URL(url);
  const token = parsed.searchParams.get('token');
  const refreshToken = parsed.searchParams.get('refreshToken');
  if (!token || !refreshToken) return;

  const data = { token, refreshToken };

  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('auth:deep-link', data);
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  } else {
    bufferedDeepLinkUrl = url;
  }
}

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

// App info
ipcMain.handle('app:getVersion', () => app.getVersion());

// Auth
ipcMain.handle('auth:get', () => getAuthData());
ipcMain.handle('auth:set', (_, data) => setAuthData(data));
ipcMain.handle('auth:clear', () => clearAuthData());
ipcMain.handle('auth:open-provider', (_, url: string) => openAuthProvider(url));

// Recording overlay
ipcMain.on('overlay:show', (_, deviceId?: string) => {
  const shouldRefocus = !mainWin?.isFocused();
  showOverlay(shouldRefocus, mainWin ?? undefined, deviceId);
});
ipcMain.on('overlay:hide', () => hideOverlay());
ipcMain.on('overlay:loading', (_, loading: boolean) => sendLoadingToOverlay(loading));
ipcMain.on('overlay:stop', () => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('shortcut:toggle-recording');
  }
});
ipcMain.on('overlay:cancel', () => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('recording:cancel');
  }
});
ipcMain.on('overlay:pause', () => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('recording:pause');
  }
});

function createWindow() {
  const iconPath = join(assetsPath, 'icon.png');

  // Open on the screen where the cursor is
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x: dx, y: dy, width, height } = display.workArea;
  const w = Math.min(1050, width);
  const h = Math.min(740, height);
  const x = Math.round(dx + (width - w) / 2);
  const y = Math.round(dy + (height - h) / 2);

  const win = new BrowserWindow({
    width: w,
    height: h,
    minWidth: w,
    minHeight: h,
    maxWidth: w,
    maxHeight: h,
    resizable: false,
    x,
    y,
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

  if (process.platform === 'darwin') {
    win.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        win.hide();
      }
    });
  }

  return win;
}

app.setName('Voca');

// Register voca:// protocol — dev mode needs execPath + project path
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient('voca', process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient('voca');
}

// macOS: deep link while app is running
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleAuthDeepLink(url);
});

// Ensure single instance (focus existing window if second instance launched)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // Windows/Linux: deep link URL passed as argv
    const deepLinkUrl = argv.find((arg) => arg.startsWith('voca://'));
    if (deepLinkUrl) handleAuthDeepLink(deepLinkUrl);

    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });
}

app.whenReady().then(() => {
  // Set dock icon on macOS (dev mode uses Electron's default otherwise)
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(join(assetsPath, 'icon.png'));
    app.dock.setIcon(dockIcon);
  }

  mainWin = createWindow();

  // Defer shortcut registration until accessibility is granted (macOS)
  if (process.platform === 'darwin') {
    const tryRegister = () => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        registerShortcuts(mainWin!);
      } else {
        setTimeout(tryRegister, 3_000);
      }
    };
    tryRegister();
  } else {
    registerShortcuts(mainWin);
  }

  // Auto-updater (production only — register noop handlers in dev)
  if (!isDev) {
    initAutoUpdater(mainWin);
  } else {
    ipcMain.handle('updater:check', () => {});
    ipcMain.handle('updater:download', () => {});
    ipcMain.handle('updater:install', () => {});
  }

  // Process buffered deep link after window is ready
  mainWin.webContents.once('did-finish-load', () => {
    if (bufferedDeepLinkUrl) {
      handleAuthDeepLink(bufferedDeepLinkUrl);
      bufferedDeepLinkUrl = null;
    }
  });

  app.on('activate', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.show();
    } else {
      mainWin = createWindow();
      registerShortcuts(mainWin);
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  unregisterShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
