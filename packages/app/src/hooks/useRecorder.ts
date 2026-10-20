import { useState, useRef, useCallback, useEffect } from 'react';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';
import { useEchoCancellationStore } from '~/stores/echoCancellation.store';

const DEFAULT_MIME = 'audio/webm';
// People release the shortcut while still finishing the last syllable
const STOP_TAIL_MS = 300;
// Live dictation needs audio while it is still being spoken; the chunks also add up to the full blob
const LIVE_TIMESLICE_MS = 250;

export const useRecorder = (deviceId: string) => {
  const noiseSuppression = useNoiseSuppressionStore((s) => s.enabled);
  const echoCancellation = useEchoCancellationStore((s) => s.enabled);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const pendingStop = useRef<{ timer: ReturnType<typeof setTimeout>; resolve: (blob: Blob | null) => void } | null>(null);
  const unmounted = useRef(false);

  const start = useCallback(async (onChunk?: (chunk: Blob) => void) => {
    // Guard against a second start (double shortcut press) leaking the first stream
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') return;

    const constraints = { noiseSuppression, echoCancellation };
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({
        audio: { ...(deviceId && { deviceId: { exact: deviceId } }), ...constraints },
      });
    } catch (err) {
      // Saved mic was unplugged — fall back to the system default instead of failing
      if (!(deviceId && err instanceof DOMException && err.name === 'OverconstrainedError')) throw err;
      s = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    }
    // Unmounted (logout) while the mic was opening: nothing would ever stop this stream
    if (unmounted.current) {
      s.getTracks().forEach((t) => t.stop());
      return;
    }

    chunks.current = [];
    const recorder = new MediaRecorder(s);
    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      chunks.current.push(e.data);
      onChunk?.(e.data);
    };
    mediaRecorder.current = recorder;
    recorder.start(onChunk ? LIVE_TIMESLICE_MS : undefined);
    setStream(s);
    setIsRecording(true);
  }, [deviceId, noiseSuppression, echoCancellation]);

  // Resolves null when cancel() wins during the tail
  const stop = useCallback(
    (): Promise<Blob | null> =>
      new Promise((resolve) => {
        const recorder = mediaRecorder.current;
        if (!recorder) {
          resolve(new Blob([], { type: DEFAULT_MIME }));
          return;
        }
        const finish = () => {
          // Strip codec params (audio/webm;codecs=opus) — the backend matches the bare type
          const type = recorder.mimeType.split(';')[0] || DEFAULT_MIME;
          const blob = new Blob(chunks.current, { type });
          chunks.current = [];
          resolve(blob);
        };
        const timer = setTimeout(() => {
          pendingStop.current = null;
          // Already stopped (e.g. device unplugged mid-recording) — stop() would throw
          if (recorder.state === 'inactive') finish();
          else {
            recorder.onstop = finish;
            recorder.stop();
          }
          recorder.stream.getTracks().forEach((t) => t.stop());
          mediaRecorder.current = null;
          setStream(null);
          setIsRecording(false);
        }, STOP_TAIL_MS);
        pendingStop.current = { timer, resolve };
      }),
    []
  );

  const pause = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause();
    }
  }, []);

  const cancel = useCallback(() => {
    if (pendingStop.current) {
      clearTimeout(pendingStop.current.timer);
      pendingStop.current.resolve(null);
      pendingStop.current = null;
    }
    const recorder = mediaRecorder.current;
    if (!recorder) return;
    recorder.onstop = null;
    if (recorder.state !== 'inactive') recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder.current = null;
    chunks.current = [];
    setStream(null);
    setIsRecording(false);
  }, []);

  // Release the mic if the owner unmounts mid-recording (e.g. logout)
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      cancel();
    };
  }, [cancel]);

  return { isRecording, stream, start, stop, pause, cancel };
};
