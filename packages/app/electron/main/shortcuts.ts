import { BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import {
  ShortcutAction,
  ShortcutConfig,
  loadShortcutConfig,
  saveShortcutConfig,
  keycodeToLabel,
  isAllowedKeycode,
  sanitizeShortcutConfig,
  DEFAULT_SHORTCUT_CONFIG,
} from './shortcutConfig';

let config: ShortcutConfig;
let keycodeMap: Map<number, ShortcutAction>;
let activeKeyDown: number | null = null;
let otherKeyPressed = false;
// Hold-to-talk: past HOLD_MS the toggle key behaves as push-to-talk instead of a tap
const HOLD_MS = 400;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let holdActive = false;
// Reported by the renderer so a hold never re-toggles a recording a tap already started
let recordingActive = false;
let capturing = false;
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let win: BrowserWindow | null = null;
let registered = false;
let ipcRegistered = false;

const isFromMainWindow = (e: IpcMainEvent | IpcMainInvokeEvent) =>
  !!win && !win.isDestroyed() && e.sender === win.webContents;

const sendToMain = (channel: string) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel);
};

function clearHoldTimer() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
}

const ACTION_TO_IPC: Record<ShortcutAction, string> = {
  'toggle-recording': 'shortcut:toggle-recording',
  'cancel-recording': 'recording:cancel',
};

function buildKeycodeMap(): Map<number, ShortcutAction> {
  const map = new Map<number, ShortcutAction>();
  for (const [action, binding] of Object.entries(config) as [ShortcutAction, ShortcutConfig[ShortcutAction]][]) {
    if (binding.enabled) {
      map.set(binding.keycode, action);
    }
  }
  return map;
}

// Separate from the key hook: on macOS the hook waits for accessibility, but the renderer
// reads the config as soon as the dashboard mounts and would get "No handler registered".
export function registerShortcutIpc(mainWin: BrowserWindow) {
  win = mainWin;
  // ipcMain.handle throws on a duplicate channel
  if (ipcRegistered) return;
  ipcRegistered = true;
  config = loadShortcutConfig();
  keycodeMap = buildKeycodeMap();

  ipcMain.handle('shortcuts:get-config', (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    return config;
  });

  ipcMain.handle('shortcuts:update-config', (e, newConfig: unknown) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    // Invalid or conflicting config: keep the current one, the renderer re-syncs from the return value
    const valid = sanitizeShortcutConfig(newConfig);
    if (!valid) return config;
    config = valid;
    keycodeMap = buildKeycodeMap();
    saveShortcutConfig(config);
    return config;
  });

  ipcMain.handle('shortcuts:reset-config', (e) => {
    if (!isFromMainWindow(e)) throw new Error('Unauthorized sender');
    config = { ...DEFAULT_SHORTCUT_CONFIG };
    keycodeMap = buildKeycodeMap();
    saveShortcutConfig(config);
    return config;
  });

  ipcMain.on('recording:state', (e, active: unknown) => {
    if (!isFromMainWindow(e) || typeof active !== 'boolean') return;
    recordingActive = active;
  });

  ipcMain.on('shortcuts:start-capture', (e) => {
    if (!isFromMainWindow(e)) return;
    clearHoldTimer();
    if (captureTimer) clearTimeout(captureTimer);
    capturing = true;
    captureTimer = setTimeout(() => {
      if (capturing) cancelCapture();
    }, 5000);
  });
}

export function registerShortcuts(mainWin: BrowserWindow) {
  registerShortcutIpc(mainWin);
  // Re-registering would stack uIOhook listeners
  if (registered) return;
  registered = true;

  uIOhook.on('keydown', (e) => {
    if (capturing) return;

    if (e.keycode === activeKeyDown) return; // auto-repeat
    if (keycodeMap.has(e.keycode) && activeKeyDown === null) {
      activeKeyDown = e.keycode;
      otherKeyPressed = false;
      holdActive = false;
      if (keycodeMap.get(e.keycode) === 'toggle-recording' && !recordingActive) {
        holdTimer = setTimeout(() => {
          holdTimer = null;
          holdActive = true;
          sendToMain(ACTION_TO_IPC['toggle-recording']);
        }, HOLD_MS);
      }
    } else if (activeKeyDown !== null) {
      otherKeyPressed = true; // chord with another key, including the other shortcut
      clearHoldTimer();
    }
  });

  uIOhook.on('keyup', (e) => {
    if (capturing) {
      if (e.keycode === UiohookKey.Escape) {
        cancelCapture();
        return;
      }
      if (!isAllowedKeycode(e.keycode)) return;
      if (win && !win.isDestroyed()) {
        win.webContents.send('shortcuts:key-captured', {
          keycode: e.keycode,
          label: keycodeToLabel(e.keycode),
        });
      }
      capturing = false;
      if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
      return;
    }

    if (e.keycode === activeKeyDown) {
      clearHoldTimer();
      const action = keycodeMap.get(e.keycode);
      if (holdActive) {
        // A chord during the hold means the user went back to typing: discard instead of transcribing
        sendToMain(ACTION_TO_IPC[otherKeyPressed ? 'cancel-recording' : 'toggle-recording']);
      } else if (!otherKeyPressed && action) {
        sendToMain(ACTION_TO_IPC[action]);
      }
      activeKeyDown = null;
      otherKeyPressed = false;
      holdActive = false;
    }
  });

  uIOhook.start();
}

function cancelCapture() {
  capturing = false;
  if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
  if (win && !win.isDestroyed()) {
    win.webContents.send('shortcuts:capture-cancelled');
  }
}

export function unregisterShortcuts() {
  if (registered) {
    registered = false;
    uIOhook.removeAllListeners();
    uIOhook.stop();
    clearHoldTimer();
  }
  if (!ipcRegistered) return;
  ipcRegistered = false;
  ipcMain.removeHandler('shortcuts:get-config');
  ipcMain.removeHandler('shortcuts:update-config');
  ipcMain.removeHandler('shortcuts:reset-config');
  ipcMain.removeAllListeners('shortcuts:start-capture');
  ipcMain.removeAllListeners('recording:state');
}
