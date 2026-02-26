import { BrowserWindow, ipcMain } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import {
  ShortcutAction,
  ShortcutConfig,
  loadShortcutConfig,
  saveShortcutConfig,
  keycodeToLabel,
  isAllowedKeycode,
  DEFAULT_SHORTCUT_CONFIG,
} from './shortcutConfig';

let config: ShortcutConfig;
let keycodeMap: Map<number, ShortcutAction>;
let activeKeyDown: number | null = null;
let otherKeyPressed = false;
let capturing = false;
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let win: BrowserWindow | null = null;

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

export function registerShortcuts(mainWin: BrowserWindow) {
  win = mainWin;
  config = loadShortcutConfig();
  keycodeMap = buildKeycodeMap();

  uIOhook.on('keydown', (e) => {
    if (capturing) return;

    if (keycodeMap.has(e.keycode)) {
      activeKeyDown = e.keycode;
      otherKeyPressed = false;
    } else if (activeKeyDown !== null) {
      otherKeyPressed = true;
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
      if (!otherKeyPressed && win && !win.isDestroyed()) {
        const action = keycodeMap.get(e.keycode);
        if (action) {
          win.webContents.send(ACTION_TO_IPC[action]);
        }
      }
      activeKeyDown = null;
      otherKeyPressed = false;
    }
  });

  uIOhook.start();

  ipcMain.handle('shortcuts:get-config', () => config);

  ipcMain.handle('shortcuts:update-config', (_, newConfig: ShortcutConfig) => {
    config = newConfig;
    keycodeMap = buildKeycodeMap();
    saveShortcutConfig(config);
    return config;
  });

  ipcMain.handle('shortcuts:reset-config', () => {
    config = { ...DEFAULT_SHORTCUT_CONFIG };
    keycodeMap = buildKeycodeMap();
    saveShortcutConfig(config);
    return config;
  });

  ipcMain.on('shortcuts:start-capture', () => {
    capturing = true;
    captureTimer = setTimeout(() => {
      if (capturing) cancelCapture();
    }, 5000);
  });
}

function cancelCapture() {
  capturing = false;
  if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
  if (win && !win.isDestroyed()) {
    win.webContents.send('shortcuts:capture-cancelled');
  }
}

export function unregisterShortcuts() {
  uIOhook.stop();
  ipcMain.removeHandler('shortcuts:get-config');
  ipcMain.removeHandler('shortcuts:update-config');
  ipcMain.removeHandler('shortcuts:reset-config');
  ipcMain.removeAllListeners('shortcuts:start-capture');
}
