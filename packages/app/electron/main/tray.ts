import { app, clipboard, ipcMain, IpcMainEvent, Menu, nativeImage, Tray } from 'electron';
import { join } from 'path';

interface TrayLabels {
  open: string;
  copy: string;
  quit: string;
}

// Shown until the renderer sends the translated labels
let labels: TrayLabels = { open: 'Open Voca', copy: 'Copy last transcript', quit: 'Quit' };
// Memory only: never written to disk, gone when the app quits
let lastTranscript = '';
let tray: Tray | null = null;

const isLabels = (v: unknown): v is TrayLabels =>
  typeof v === 'object' && v !== null &&
  ['open', 'copy', 'quit'].every((k) => typeof (v as Record<string, unknown>)[k] === 'string');

function buildMenu(showWindow: () => void) {
  return Menu.buildFromTemplate([
    { label: labels.open, click: showWindow },
    { label: labels.copy, enabled: lastTranscript !== '', click: () => clipboard.writeText(lastTranscript) },
    { type: 'separator' },
    { label: labels.quit, click: () => app.quit() },
  ]);
}

export function initTray(
  assetsPath: string,
  showWindow: () => void,
  isFromMainWindow: (e: IpcMainEvent) => boolean
) {
  // macOS wants a monochrome template image; the colored app icon would not adapt to light/dark menu bars
  const isMac = process.platform === 'darwin';
  const image = isMac
    ? nativeImage.createFromPath(join(assetsPath, 'trayTemplate.png'))
    : nativeImage.createFromPath(join(assetsPath, 'icon.png')).resize({ width: 32, height: 32 });
  if (isMac) image.setTemplateImage(true);

  tray = new Tray(image);
  tray.setToolTip('Voca');
  const refresh = () => tray?.setContextMenu(buildMenu(showWindow));
  refresh();

  // macOS opens the menu on click; Windows reserves the context menu for right-click
  if (!isMac) tray.on('click', showWindow);

  ipcMain.on('tray:set-labels', (e, next: unknown) => {
    if (!isFromMainWindow(e) || !isLabels(next)) return;
    labels = { open: next.open, copy: next.copy, quit: next.quit };
    refresh();
  });

  ipcMain.on('tray:set-last-transcript', (e, text: unknown) => {
    if (!isFromMainWindow(e) || typeof text !== 'string') return;
    lastTranscript = text;
    refresh();
  });
}
