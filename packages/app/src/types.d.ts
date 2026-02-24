export {};

type MicrophoneStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

interface AuthData {
  token: string;
  refreshToken: string;
}

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      getVersion: () => Promise<string>;
      permissions: {
        getMicrophoneStatus: () => Promise<MicrophoneStatus>;
        requestMicrophone: () => Promise<boolean>;
        openMicrophoneSettings: () => Promise<void>;
        getAccessibilityStatus: () => Promise<boolean>;
        openAccessibilitySettings: () => Promise<void>;
      };
      onToggleRecording: (callback: () => void) => () => void;
      pasteTranscript: (text: string) => void;

      // Overlay
      showOverlay: (deviceId?: string) => void;
      hideOverlay: () => void;
      setOverlayLoading: (loading: boolean) => void;
      onOverlayLoading: (callback: (loading: boolean) => void) => () => void;
      requestStopRecording: () => void;
      requestCancelRecording: () => void;
      requestPauseRecording: () => void;
      onCancelRecording: (callback: () => void) => () => void;
      onPauseRecording: (callback: () => void) => () => void;

      // Auth
      auth: {
        get: () => Promise<AuthData | null>;
        set: (data: AuthData) => Promise<void>;
        clear: () => Promise<void>;
        openProvider: (url: string) => Promise<void>;
        onAuthCallback: (cb: (data: AuthData) => void) => () => void;
      };

      // Auto-updater
      updater: {
        checkForUpdates: () => Promise<void>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        onUpdateAvailable: (cb: (data: { version: string }) => void) => () => void;
        onDownloadProgress: (cb: (data: { percent: number }) => void) => () => void;
        onUpdateDownloaded: (cb: (data: { version: string }) => void) => () => void;
      };
    };
  }
}
