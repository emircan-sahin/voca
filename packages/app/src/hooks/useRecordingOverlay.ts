import { useEffect, useRef } from 'react';

export function useRecordingOverlay(stream: MediaStream | null, deviceId: string) {
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  useEffect(() => {
    if (!stream) return;
    window.electronAPI.showOverlay(deviceIdRef.current);
  }, [stream]);
}
