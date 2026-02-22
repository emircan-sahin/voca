export {};

type MicrophoneStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

declare global {
  interface Window {
    electronAPI: {
      platform: string;
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
      showOverlay: () => void;
      hideOverlay: () => void;
      sendAudioData: (data: number[]) => void;
      onAudioData: (callback: (data: number[]) => void) => () => void;
      requestStopRecording: () => void;
    };
  }
}
