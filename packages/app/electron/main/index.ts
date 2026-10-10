import { app, BrowserWindow, screen, shell, ipcMain, systemPreferences, clipboard, nativeImage, session, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import path, { join } from 'path';
import { execFile } from 'child_process';
import { registerShortcutIpc, registerShortcuts, unregisterShortcuts } from './shortcuts';
import { showOverlay, hideOverlay, sendLoadingToOverlay, isFromOverlayWindow } from './overlay';
import { getAuthData, setAuthData, clearAuthData, openAuthProvider, hasPendingLogin, takePendingVerifier } from './auth';
import { initAutoUpdater } from './updater';
import { initTray } from './tray';
import { launchedHidden, registerLoginItemIpc } from './loginItem';

const isDev = !!process.env['ELECTRON_RENDERER_URL'];

// Enable CDP for Playwright MCP in dev mode — never in a packaged build, whatever the env says
if (isDev && !app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}
const assetsPath = isDev
  ? join(__dirname, '../../../../assets')
  : join(process.resourcesPath, 'assets');

let mainWin: BrowserWindow | null = null;
let bufferedDeepLinkUrl: string | null = null;
let isQuitting = false;
let rendererLoaded = false;

// Auth, paste and permission IPC are for the main window only (the overlay shares the preload)
const isFromMainWindow = (e: IpcMainEvent | IpcMainInvokeEvent) =>
  !!mainWin && !mainWin.isDestroyed() && e.sender === mainWin.webContents;

function handleAuthDeepLink(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== 'voca:' || parsed.hostname !== 'auth' || parsed.pathname.replace(/\/$/, '') !== '/callback') return;
  // Any web page can fire a voca:// link; only a code redeemable with our pending PKCE verifier is useful
  const code = parsed.searchParams.get('code');
  if (!code || !/^[A-Za-z0-9_-]{43}$/.test(code) || !hasPendingLogin()) return;

  // Renderer isn't listening until the page has loaded — keep the link for did-finish-load
  if (!mainWin || mainWin.isDestroyed() || !rendererLoaded) {
    bufferedDeepLinkUrl = url;
    return;
  }

  const verifier = takePendingVerifier();
  if (!verifier) return;
  mainWin.webContents.send('auth:deep-link', { code, verifier });
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show(); // closing only hides the window
  mainWin.focus();
}

function openSettingsUrl(url: string) {
  shell.openExternal(url).catch((err) => console.warn('[Permissions] openExternal failed:', err.message ?? err));
}

// Microphone
ipcMain.handle('permissions:getMicrophoneStatus', (e) => {
  if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
  return systemPreferences.getMediaAccessStatus('microphone');
});

ipcMain.handle('permissions:requestMicrophone', async (e) => {
  if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
  return await systemPreferences.askForMediaAccess('microphone');
});

ipcMain.handle('permissions:openMicrophoneSettings', (e) => {
  if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
  openSettingsUrl(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  );
});

// Accessibility
ipcMain.handle('permissions:getAccessibilityStatus', (e) => {
  if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
  return systemPreferences.isTrustedAccessibilityClient(false);
});

ipcMain.handle('permissions:openAccessibilitySettings', (e) => {
  if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
  systemPreferences.isTrustedAccessibilityClient(true); // macOS native prompt
  openSettingsUrl(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  );
});

// Paste transcript into active app, then put the user's clipboard back
// The target app reads the clipboard when it handles Cmd+V on its own main thread; busy
// Electron apps (Slack, VS Code) can take several hundred ms, and restoring too early pastes the old content.
const CLIPBOARD_RESTORE_DELAY_MS = 1000;
let clipboardBackup: Electron.Data | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

function backupClipboard(): Electron.Data {
  const data: Electron.Data = {};
  const text = clipboard.readText();
  const html = clipboard.readHTML();
  const rtf = clipboard.readRTF();
  const image = clipboard.readImage();
  if (text) data.text = text;
  if (html) data.html = html;
  if (rtf) data.rtf = rtf;
  if (!image.isEmpty()) data.image = image;
  return data;
}

function restoreClipboard(pastedText: string) {
  const backup = clipboardBackup;
  clipboardBackup = null;
  restoreTimer = null;
  // The user copied something new in the meantime — don't clobber it
  if (!backup || clipboard.readText() !== pastedText) return;
  if (Object.keys(backup).length === 0) clipboard.clear();
  else clipboard.write(backup);
}

// Paste failed: the transcript stays on the clipboard (no restore) and the renderer tells the user
function notifyPasteFailed() {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('transcript:paste-failed');
}

// Packaged: Contents/Resources/bin. Dev: built by scripts/build-native.mjs next to the app sources.
const typeHelperPath = app.isPackaged
  ? join(process.resourcesPath, 'bin', 'voca-type')
  : join(__dirname, '../../resources/bin/voca-type');

/** Types the text at the cursor without the clipboard. Resolves false if it couldn't start (caller falls back). */
function typeDirectly(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Exits before typing anything when it can't (2 = no Accessibility permission, or not built)
    const child = execFile(typeHelperPath, [], { timeout: 15_000 }, (err) => {
      if (err) console.warn('[Paste] direct typing unavailable:', err.message);
      resolve(!err);
    });
    child.stdin?.end(text);
  });
}

ipcMain.on('transcript:paste-text', async (e, payload: unknown) => {
  if (!isFromMainWindow(e) || typeof payload !== 'object' || payload === null) return;
  const { text, direct } = payload as { text?: unknown; direct?: unknown };
  if (typeof text !== 'string' || !text) return;

  // A newline would be typed as Enter, which sends the message in chat apps; those go through the clipboard
  if (process.platform === 'darwin' && direct === true && !text.includes('\n')) {
    await new Promise((r) => setTimeout(r, 100));
    if (await typeDirectly(text)) return;
  }

  // No paste automation on Linux — leave the text on the clipboard for a manual paste
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    clipboard.writeText(text);
    return;
  }

  // Without accessibility permission the keystroke is silently dropped
  if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(false)) {
    clipboard.writeText(text);
    notifyPasteFailed();
    return;
  }

  // A previous paste is still pending: keep its backup, it holds the user's original content
  if (restoreTimer) clearTimeout(restoreTimer);
  else clipboardBackup = backupClipboard();
  clipboard.writeText(text);

  const done = (err: Error | null) => {
    if (restoreTimer) clearTimeout(restoreTimer);
    if (err) {
      console.warn('[Paste] keystroke failed:', err.message);
      restoreTimer = null;
      clipboardBackup = null;
      notifyPasteFailed();
      return;
    }
    restoreTimer = setTimeout(() => restoreClipboard(text), CLIPBOARD_RESTORE_DELAY_MS);
  };

  setTimeout(() => {
    if (process.platform === 'darwin') {
      execFile('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'], done);
    } else {
      execFile(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"],
        { windowsHide: true },
        done
      );
    }
  }, 100);
});

// App info
ipcMain.handle('app:getVersion', () => app.getVersion());

// Auth — registered in whenReady() to ensure safeStorage uses correct keychain name

// Recording overlay — show/hide/loading come from the main window, stop/cancel/pause from the overlay
ipcMain.on('overlay:show', (e, deviceId: unknown, locale: unknown) => {
  if (!isFromMainWindow(e)) return;
  const shouldRefocus = !mainWin?.isFocused();
  showOverlay(
    shouldRefocus,
    mainWin ?? undefined,
    typeof deviceId === 'string' ? deviceId : undefined,
    typeof locale === 'string' ? locale : undefined
  );
});
ipcMain.on('overlay:hide', (e) => {
  if (isFromMainWindow(e)) hideOverlay();
});
ipcMain.on('overlay:loading', (e, loading: unknown) => {
  if (isFromMainWindow(e) && typeof loading === 'boolean') sendLoadingToOverlay(loading);
});
const forwardFromOverlay = (channel: string, rendererChannel: string) =>
  ipcMain.on(channel, (e) => {
    if (isFromOverlayWindow(e) && mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(rendererChannel);
    }
  });
forwardFromOverlay('overlay:stop', 'shortcut:toggle-recording');
forwardFromOverlay('overlay:cancel', 'recording:cancel');
forwardFromOverlay('overlay:pause', 'recording:pause');

function showMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

function createWindow(startHidden = false) {
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
    show: !startHidden,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Allow requests to the API regardless of CORS (desktop app, no browser origin)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
      },
    });
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // The window must never leave the app origin (a navigated page would keep the preload bridge)
  const appOrigin = process.env['ELECTRON_RENDERER_URL'] ? new URL(process.env['ELECTRON_RENDERER_URL']).origin : 'file://';
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(appOrigin)) e.preventDefault();
  });

  win.webContents.setWindowOpenHandler((details) => {
    try {
      const protocol = new URL(details.url).protocol;
      if (['http:', 'https:', 'mailto:'].includes(protocol)) {
        shell.openExternal(details.url);
      }
    } catch {
      /* invalid URL — ignore */
    }
    return { action: 'deny' };
  });

  // Closing hides the window so the global shortcut keeps working; quit via tray, menu or updater
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  // Windows logoff/shutdown skips before-quit, and a prevented close would block it
  win.on('session-end', () => { isQuitting = true; });

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

    showMainWindow();
  });
}

app.whenReady().then(() => {
  if (!gotTheLock) return; // second instance is already quitting

  // Auth IPC — must be after app ready so safeStorage uses correct keychain name
  const guarded = <A extends unknown[], R>(fn: (...args: A) => R) =>
    (e: IpcMainInvokeEvent, ...args: A): R => {
      if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
      return fn(...args);
    };
  ipcMain.handle('auth:get', guarded(() => getAuthData()));
  ipcMain.handle('auth:set', guarded((data: Parameters<typeof setAuthData>[0]) => setAuthData(data)));
  ipcMain.handle('auth:clear', guarded(() => clearAuthData()));
  ipcMain.handle('auth:open-provider', guarded((url: unknown) => openAuthProvider(url)));

  // Set dock icon on macOS (dev mode uses Electron's default otherwise)
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(join(assetsPath, 'icon.png'));
    app.dock.setIcon(dockIcon);
  }

  mainWin = createWindow(launchedHidden());
  registerShortcutIpc(mainWin);
  initTray(assetsPath, showMainWindow, isFromMainWindow);
  registerLoginItemIpc(isFromMainWindow);

  // Defer shortcut registration until accessibility is granted (macOS)
  if (process.platform === 'darwin') {
    const tryRegister = () => {
      if (isQuitting) return;
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        if (mainWin && !mainWin.isDestroyed()) registerShortcuts(mainWin);
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
    initAutoUpdater(mainWin, () => { isQuitting = true; }, isFromMainWindow);
  } else {
    ipcMain.handle('updater:check', () => {});
    ipcMain.handle('updater:download', () => {});
    ipcMain.handle('updater:install', () => {});
  }

  // Process buffered deep link after window is ready
  mainWin.webContents.once('did-finish-load', () => {
    rendererLoaded = true;
    const url = bufferedDeepLinkUrl;
    bufferedDeepLinkUrl = null;
    if (url) handleAuthDeepLink(url);
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
