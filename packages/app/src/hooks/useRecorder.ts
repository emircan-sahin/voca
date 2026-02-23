import { useState, useRef, useCallback } from 'react';

export const useRecorder = (deviceId: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    setStream(s);
    mediaRecorder.current = new MediaRecorder(s);
    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  }, [deviceId]);

  const stop = useCallback(
    (): Promise<Blob> =>
      new Promise((resolve) => {
        mediaRecorder.current!.onstop = () => {
          const blob = new Blob(chunks.current, { type: 'audio/webm' });
          chunks.current = [];
          resolve(blob);
        };
        mediaRecorder.current!.stop();
        mediaRecorder.current!.stream.getTracks().forEach((t) => t.stop());
        setStream(null);
        setIsRecording(false);
      }),
    []
  );

  const cancel = useCallback(() => {
    if (!mediaRecorder.current) return;
    mediaRecorder.current.onstop = null;
    mediaRecorder.current.stop();
    mediaRecorder.current.stream.getTracks().forEach((t) => t.stop());
    chunks.current = [];
    setStream(null);
    setIsRecording(false);
  }, []);

  return { isRecording, stream, start, stop, cancel };
};
