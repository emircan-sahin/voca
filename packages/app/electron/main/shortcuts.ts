import { BrowserWindow } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';

let rightMetaDown = false;
let rightAltDown = false;
let otherKeyPressed = false;

export function registerShortcuts(win: BrowserWindow) {
  uIOhook.on('keydown', (e) => {
    if (e.keycode === UiohookKey.MetaRight) {
      rightMetaDown = true;
      otherKeyPressed = false;
    } else if (e.keycode === UiohookKey.AltRight) {
      rightAltDown = true;
      otherKeyPressed = false;
    } else if (rightMetaDown || rightAltDown) {
      otherKeyPressed = true;
    }
  });

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.MetaRight && rightMetaDown) {
      if (!otherKeyPressed && !win.isDestroyed()) {
        win.webContents.send('shortcut:toggle-recording');
      }
      rightMetaDown = false;
      otherKeyPressed = false;
    } else if (e.keycode === UiohookKey.AltRight && rightAltDown) {
      if (!otherKeyPressed && !win.isDestroyed()) {
        win.webContents.send('recording:cancel');
      }
      rightAltDown = false;
      otherKeyPressed = false;
    }
  });

  uIOhook.start();
}

export function unregisterShortcuts() {
  uIOhook.stop();
}
