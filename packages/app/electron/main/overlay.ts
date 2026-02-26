import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { execSync, execFile } from 'child_process';

let overlayWin: BrowserWindow | null = null;

export function showOverlay(refocusPreviousApp: boolean, parentWin?: BrowserWindow, deviceId?: string) {
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

  // Use the display where the main window is, falling back to primary
  const display = parentWin
    ? screen.getDisplayMatching(parentWin.getBounds())
    : screen.getPrimaryDisplay();
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

  overlayWin.setAlwaysOnTop(true, 'floating');
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

  // Load the React overlay page — pass deviceId as query param so it's
  // available immediately (no IPC timing issues).
  const qs = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html${qs}`);
  } else {
    overlayWin.loadFile(join(__dirname, '../renderer/overlay.html'), { query: deviceId ? { deviceId } : {} });
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
