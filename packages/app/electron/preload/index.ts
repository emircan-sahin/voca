import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  permissions: {
    getMicrophoneStatus: () => ipcRenderer.invoke('permissions:getMicrophoneStatus'),
    requestMicrophone: () => ipcRenderer.invoke('permissions:requestMicrophone'),
    openMicrophoneSettings: () => ipcRenderer.invoke('permissions:openMicrophoneSettings'),
    getAccessibilityStatus: () => ipcRenderer.invoke('permissions:getAccessibilityStatus'),
    openAccessibilitySettings: () => ipcRenderer.invoke('permissions:openAccessibilitySettings'),
  },
  onToggleRecording: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:toggle-recording', handler);
    return () => {
      ipcRenderer.removeListener('shortcut:toggle-recording', handler);
    };
  },
  pasteTranscript: (text: string) => {
    ipcRenderer.send('transcript:paste-text', text);
  },

  // Overlay
  showOverlay: (deviceId?: string) => ipcRenderer.send('overlay:show', deviceId),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  setOverlayLoading: (loading: boolean) => ipcRenderer.send('overlay:loading', loading),
  onOverlayLoading: (callback: (loading: boolean) => void) => {
    const handler = (_: unknown, loading: boolean) => callback(loading);
    ipcRenderer.on('overlay:loading', handler);
    return () => {
      ipcRenderer.removeListener('overlay:loading', handler);
    };
  },
  requestStopRecording: () => ipcRenderer.send('overlay:stop'),
  requestCancelRecording: () => ipcRenderer.send('overlay:cancel'),
  requestPauseRecording: () => ipcRenderer.send('overlay:pause'),
  onCancelRecording: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('recording:cancel', handler);
    return () => {
      ipcRenderer.removeListener('recording:cancel', handler);
    };
  },

  onPauseRecording: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('recording:pause', handler);
    return () => {
      ipcRenderer.removeListener('recording:pause', handler);
    };
  },

  // Auth
  auth: {
    get: () => ipcRenderer.invoke('auth:get'),
    set: (data: unknown) => ipcRenderer.invoke('auth:set', data),
    clear: () => ipcRenderer.invoke('auth:clear'),
    openProvider: (url: string) => ipcRenderer.invoke('auth:open-provider', url),
    onAuthCallback: (cb: (data: { token: string; refreshToken: string }) => void) => {
      const handler = (_: unknown, data: { token: string; refreshToken: string }) => cb(data);
      ipcRenderer.on('auth:deep-link', handler);
      return () => {
        ipcRenderer.removeListener('auth:deep-link', handler);
      };
    },
  },

  // Shortcuts
  shortcuts: {
    getConfig: () => ipcRenderer.invoke('shortcuts:get-config'),
    updateConfig: (config: unknown) => ipcRenderer.invoke('shortcuts:update-config', config),
    resetConfig: () => ipcRenderer.invoke('shortcuts:reset-config'),
    startCapture: () => ipcRenderer.send('shortcuts:start-capture'),
    onKeyCaptured: (cb: (data: { keycode: number; label: string }) => void) => {
      const handler = (_: unknown, data: { keycode: number; label: string }) => cb(data);
      ipcRenderer.on('shortcuts:key-captured', handler);
      return () => { ipcRenderer.removeListener('shortcuts:key-captured', handler); };
    },
    onCaptureCancelled: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('shortcuts:capture-cancelled', handler);
      return () => { ipcRenderer.removeListener('shortcuts:capture-cancelled', handler); };
    },
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (cb: (data: { version: string }) => void) => {
      const handler = (_: unknown, data: { version: string }) => cb(data);
      ipcRenderer.on('updater:update-available', handler);
      return () => {
        ipcRenderer.removeListener('updater:update-available', handler);
      };
    },
    onDownloadProgress: (cb: (data: { percent: number }) => void) => {
      const handler = (_: unknown, data: { percent: number }) => cb(data);
      ipcRenderer.on('updater:download-progress', handler);
      return () => {
        ipcRenderer.removeListener('updater:download-progress', handler);
      };
    },
    onUpdateDownloaded: (cb: (data: { version: string }) => void) => {
      const handler = (_: unknown, data: { version: string }) => cb(data);
      ipcRenderer.on('updater:update-downloaded', handler);
      return () => {
        ipcRenderer.removeListener('updater:update-downloaded', handler);
      };
    },
  },
});
