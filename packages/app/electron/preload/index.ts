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
});
