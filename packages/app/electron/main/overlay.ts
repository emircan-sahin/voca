import { BrowserWindow, IpcMainEvent, screen } from 'electron';
import { join } from 'path';
import { execSync, execFile } from 'child_process';

let overlayWin: BrowserWindow | null = null;

// Stop/cancel/pause drive the recording; only the overlay itself may send them
export const isFromOverlayWindow = (e: IpcMainEvent) =>
  !!overlayWin && !overlayWin.isDestroyed() && e.sender === overlayWin.webContents;

export function showOverlay(refocusPreviousApp: boolean, parentWin?: BrowserWindow, deviceId?: string, locale?: string) {
  if (overlayWin) return;

  // Capture the frontmost app before we create any window
  let previousApp = '';
  let previousPid = 0;
  if (refocusPreviousApp) {
    try {
      if (process.platform === 'darwin') {
        previousApp = execSync(
          `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`,
          { timeout: 500 }
        )
          .toString()
          .trim();
      } else {
        previousPid = parseInt(
          execSync(
            `powershell -Command "(Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow();' -Name W -Namespace N -PassThru)::GetForegroundWindow()}).Id"`,
            { timeout: 500 }
          )
            .toString()
            .trim(),
          10
        );
      }
    } catch {
      /* ignore */
    }
  }

  // Shortcut-triggered recordings belong on the display the user is working on
  // (cursor), not wherever the hidden main window happens to be.
  const display = refocusPreviousApp || !parentWin
    ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    : screen.getDisplayMatching(parentWin.getBounds());
  const { workArea } = display;
  const width = 340;
  const height = 210;

  overlayWin = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + workArea.width / 2 - width / 2),
    y: workArea.y + workArea.height - height - 12,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    // NSPanel can float over other apps' fullscreen Spaces; a regular NSWindow can't.
    ...(process.platform === 'darwin' && { type: 'panel' }),
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  // skipTransformProcessType: the default path hides the Dock icon (app.dock.hide),
  // which a panel doesn't need to appear above fullscreen apps.
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  overlayWin.once('ready-to-show', () => {
    overlayWin?.showInactive();

    // Re-focus the app the user was in before overlay appeared
    if (process.platform === 'darwin') {
      if (previousApp && previousApp !== 'Electron') {
        const sanitized = previousApp.replace(/[^a-zA-Z0-9 .\-_]/g, '');
        if (sanitized && sanitized.length <= 100) {
          setTimeout(() => {
            execFile(
              'osascript',
              ['-e', `tell application "${sanitized}" to activate`],
              { timeout: 2000 },
              (err) => { if (err) console.warn('[Overlay] Failed to refocus app:', err.message); }
            );
          }, 150);
        }
      }
    } else {
      if (previousPid && Number.isFinite(previousPid) && previousPid > 0) {
        setTimeout(() => {
          execFile(
            'powershell',
            ['-Command', `(New-Object -ComObject WScript.Shell).AppActivate(${previousPid})`],
            { timeout: 2000 },
            (err) => { if (err) console.warn('[Overlay] Failed to refocus app:', err.message); }
          );
        }, 150);
      }
    }
  });
  overlayWin.on('closed', () => {
    overlayWin = null;
  });

  // Load the React overlay page — pass deviceId and the app language as query params so
  // they're available immediately (no IPC timing issues).
  const query: Record<string, string> = {};
  if (deviceId) query.deviceId = deviceId;
  if (locale) query.lang = locale;
  if (process.env['ELECTRON_RENDERER_URL']) {
    const qs = new URLSearchParams(query).toString();
    overlayWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html${qs ? `?${qs}` : ''}`);
  } else {
    overlayWin.loadFile(join(__dirname, '../renderer/overlay.html'), { query });
  }
}

export function hideOverlay() {
  if (!overlayWin) return;
  overlayWin.close();
  overlayWin = null;
}

export function sendLoadingToOverlay(loading: boolean) {
  overlayWin?.webContents.send('overlay:loading', loading);
}
