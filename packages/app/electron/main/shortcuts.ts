import { BrowserWindow } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';

let rightMetaDown = false;
let otherKeyPressed = false;

export function registerShortcuts(win: BrowserWindow) {
  uIOhook.on('keydown', (e) => {
    if (e.keycode === UiohookKey.MetaRight) {
      rightMetaDown = true;
      otherKeyPressed = false;
    } else if (rightMetaDown) {
      otherKeyPressed = true;
    }
  });

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.MetaRight && rightMetaDown) {
      if (!otherKeyPressed) {
        win.webContents.send('shortcut:toggle-recording');
      }
      rightMetaDown = false;
      otherKeyPressed = false;
    }
  });

  uIOhook.start();
}

export function unregisterShortcuts() {
  uIOhook.stop();
}
