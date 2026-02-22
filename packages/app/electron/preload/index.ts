import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
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
  showOverlay: () => ipcRenderer.send('overlay:show'),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  sendAudioData: (data: number[]) => ipcRenderer.send('overlay:audio-data', data),
  onAudioData: (callback: (data: number[]) => void) => {
    const handler = (_: unknown, data: number[]) => callback(data);
    ipcRenderer.on('overlay:audio-data', handler);
    return () => {
      ipcRenderer.removeListener('overlay:audio-data', handler);
    };
  },
  requestStopRecording: () => ipcRenderer.send('overlay:stop'),
});
