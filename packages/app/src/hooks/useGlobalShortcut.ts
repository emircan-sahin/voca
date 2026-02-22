import { useEffect } from 'react';

export function useGlobalShortcut(callback: () => void) {
  useEffect(() => {
    const cleanup = window.electronAPI.onToggleRecording(callback);
    return cleanup;
  }, [callback]);
}
