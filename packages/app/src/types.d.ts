export {};

declare global {
  type MicrophoneStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

  interface AuthData {
    token: string;
    refreshToken: string;
  }

  /** voca:// deep link payload: one-time code + the PKCE verifier that redeems it */
  interface AuthCallbackData {
    code: string;
    verifier: string;
  }

  type ShortcutAction = 'toggle-recording' | 'cancel-recording';

  interface ShortcutBinding {
    keycode: number;
    label: string;
    enabled: boolean;
  }

  type ShortcutConfig = Record<ShortcutAction, ShortcutBinding>;

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
      pasteTranscript: (text: string, direct: boolean) => void;
      onPasteFailed: (callback: () => void) => () => void;
      setRecordingState: (active: boolean) => void;

      // Overlay
      showOverlay: (deviceId?: string, locale?: string) => void;
      hideOverlay: () => void;
      setOverlayLoading: (loading: boolean) => void;
      onOverlayLoading: (callback: (loading: boolean) => void) => () => void;
      requestStopRecording: () => void;
      requestCancelRecording: () => void;
      requestPauseRecording: () => void;
      onCancelRecording: (callback: () => void) => () => void;
      onPauseRecording: (callback: () => void) => () => void;

      // Shortcuts
      shortcuts: {
        getConfig: () => Promise<ShortcutConfig>;
        updateConfig: (config: ShortcutConfig) => Promise<ShortcutConfig>;
        resetConfig: () => Promise<ShortcutConfig>;
        startCapture: () => void;
        onKeyCaptured: (cb: (data: { keycode: number; label: string }) => void) => () => void;
        onCaptureCancelled: (cb: () => void) => () => void;
      };

      // Auth
      auth: {
        get: () => Promise<AuthData | null>;
        set: (data: AuthData) => Promise<void>;
        clear: () => Promise<void>;
        openProvider: (url: string) => Promise<void>;
        onAuthCallback: (cb: (data: AuthCallbackData) => void) => () => void;
      };

      // Tray and launch at login
      tray: {
        setLabels: (labels: { open: string; copy: string; quit: string }) => void;
        setLastTranscript: (text: string) => void;
      };
      loginItem: {
        get: () => Promise<boolean>;
        set: (enabled: boolean) => Promise<boolean>;
      };

      // Auto-updater
      updater: {
        checkForUpdates: () => Promise<void>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        onUpdateAvailable: (cb: (data: { version: string }) => void) => () => void;
        onDownloadProgress: (cb: (data: { percent: number }) => void) => () => void;
        onUpdateError: (cb: () => void) => () => void;
        onUpdateDownloaded: (cb: (data: { version: string }) => void) => () => void;
      };
    };
  }
}
