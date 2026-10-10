import { useEffect, useRef } from 'react';
import i18n from 'i18next';

export function useRecordingOverlay(stream: MediaStream | null, deviceId: string) {
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  useEffect(() => {
    if (!stream) return;
    window.electronAPI.showOverlay(deviceIdRef.current, i18n.language);
  }, [stream]);
}
