import { useEffect, useRef } from 'react';

export function useRecordingOverlay(stream: MediaStream | null) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) return;

    window.electronAPI.showOverlay();

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const send = () => {
      rafRef.current = requestAnimationFrame(send);
      analyser.getByteFrequencyData(dataArray);
      window.electronAPI.sendAudioData(Array.from(dataArray));
    };
    send();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);
}
