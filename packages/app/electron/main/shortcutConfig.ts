import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { UiohookKey } from 'uiohook-napi';

export type ShortcutAction = 'toggle-recording' | 'cancel-recording';

export interface ShortcutBinding {
  keycode: number;
  label: string;
  enabled: boolean;
}

export type ShortcutConfig = Record<ShortcutAction, ShortcutBinding>;

export const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  'toggle-recording': {
    keycode: UiohookKey.MetaRight,
    label: 'MetaRight',
    enabled: true,
  },
  'cancel-recording': {
    keycode: UiohookKey.AltRight,
    label: 'AltRight',
    enabled: true,
  },
};

const ALLOWED_KEYCODES = new Set([
  UiohookKey.MetaRight, UiohookKey.MetaLeft,
  UiohookKey.AltRight, UiohookKey.Alt,
  UiohookKey.CtrlRight, UiohookKey.Ctrl,
  UiohookKey.ShiftRight, UiohookKey.Shift,
  59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88, // F1-F12
  91, 92, 93, 99, 100, 101, 102, 103,               // F13-F20
]);

export function isAllowedKeycode(keycode: number): boolean {
  return ALLOWED_KEYCODES.has(keycode);
}

const KEYCODE_LABELS: Record<number, string> = {
  [UiohookKey.MetaRight]: 'MetaRight',
  [UiohookKey.MetaLeft]: 'MetaLeft',
  [UiohookKey.AltRight]: 'AltRight',
  [UiohookKey.Alt]: 'AltLeft',
  [UiohookKey.CtrlRight]: 'CtrlRight',
  [UiohookKey.Ctrl]: 'CtrlLeft',
  [UiohookKey.ShiftRight]: 'ShiftRight',
  [UiohookKey.Shift]: 'ShiftLeft',
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6',
  65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',
  91: 'F13', 92: 'F14', 93: 'F15', 99: 'F16', 100: 'F17',
  101: 'F18', 102: 'F19', 103: 'F20',
};

export function keycodeToLabel(keycode: number): string {
  return KEYCODE_LABELS[keycode] ?? `Key(${keycode})`;
}

const getStorePath = () => join(app.getPath('userData'), 'shortcuts.json');

export function loadShortcutConfig(): ShortcutConfig {
  try {
    const path = getStorePath();
    if (!existsSync(path)) return { ...DEFAULT_SHORTCUT_CONFIG };
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ShortcutConfig>;
    return { ...DEFAULT_SHORTCUT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_SHORTCUT_CONFIG };
  }
}

export function saveShortcutConfig(config: ShortcutConfig): void {
  writeFileSync(getStorePath(), JSON.stringify(config, null, 2), 'utf-8');
}
