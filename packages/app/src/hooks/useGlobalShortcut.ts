import { useEffect, useRef } from 'react';

export function useGlobalShortcut(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return window.electronAPI.onToggleRecording(() => callbackRef.current());
  }, []);
}
