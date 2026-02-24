import { useEffect, useRef, useState, useCallback } from 'react';

const BAR_COUNT = 48;
const LERP = 0.18;
const ACCENT = '#dc2626';
const MAX_SECONDS = 300;

export function RecordingOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentHeights = useRef(new Float32Array(BAR_COUNT));
  const targetHeights = useRef(new Float32Array(BAR_COUNT));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const freqData = useRef(new Uint8Array(0));
  const rafRef = useRef(0);
  const startTime = useRef(Date.now());
  const autoPaused = useRef(false);
  const [timer, setTimer] = useState('00:00');
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Timer + auto-pause at MAX_SECONDS
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startTime.current) / 1000);
      const capped = Math.min(s, MAX_SECONDS);
      setTimer(
        String(Math.floor(capped / 60)).padStart(2, '0') + ':' +
        String(capped % 60).padStart(2, '0')
      );
      if (s >= MAX_SECONDS && !autoPaused.current) {
        autoPaused.current = true;
        clearInterval(id);
        analyserRef.current = null;
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        setPaused(true);
        window.electronAPI.requestPauseRecording();
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Local mic capture — overlay is always visible so AudioContext is never throttled.
  // Stores analyser in a ref; the animation loop reads from it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deviceId = params.get('deviceId') || '';

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        freqData.current = new Uint8Array(analyser.frequencyBinCount);
        analyserRef.current = analyser;
      } catch {
        // Mic access failed — waveform will show idle animation
      }
    })();

    return () => {
      cancelled = true;
      analyserRef.current = null;
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  // Loading state listener
  useEffect(() => {
    const cleanup = window.electronAPI.onOverlayLoading((value) => {
      setLoading(value);
    });
    return cleanup;
  }, []);

  // Single RAF loop: reads frequency data and renders waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // Read latest frequency snapshot from the analyser (set by mic capture effect)
      analyserRef.current?.getByteFrequencyData(freqData.current);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const t = Date.now() / 1000;
      const data = freqData.current;

      for (let i = 0; i < BAR_COUNT; i++) {
        if (autoPaused.current) {
          targetHeights.current[i] = 0.04;
        } else {
          const idx = Math.floor((i / BAR_COUNT) * data.length);
          const audioVal = (data[idx] || 0) / 255;

          const idle =
            0.08 +
            0.06 * Math.sin(t * 2.5 + i * 0.4) +
            0.04 * Math.sin(t * 1.7 + i * 0.7);

          targetHeights.current[i] = Math.max(idle, audioVal);
        }
        currentHeights.current[i] +=
          (targetHeights.current[i] - currentHeights.current[i]) * LERP;
      }

      const gap = 2;
      const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const cy = h / 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        const barH = Math.max(2, currentHeights.current[i] * h * 0.85);
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.roundRect(i * (barW + gap), cy - barH / 2, barW, barH, 1);
        ctx.fill();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleStop = useCallback(() => {
    window.electronAPI.requestStopRecording();
  }, []);

  const handleCancel = useCallback(() => {
    window.electronAPI.requestCancelRecording();
  }, []);

  return (
    <div className="animate-slide-up mx-auto mb-2 w-[320px] rounded-2xl border border-[#e5e5e5] p-4 shadow-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            loading ? 'bg-neutral-400 animate-pulse'
            : paused ? 'bg-amber-500'
            : 'animate-pulse bg-red-600'
          }`} />
          <span className="text-[13px] font-semibold text-[#171717]">
            {loading ? 'Processing...' : paused ? 'Time\'s up' : 'Recording'}
          </span>
        </div>
        <span className="font-mono text-[13px] text-[#737373]">{timer}</span>
      </div>

      {/* Waveform / Loading */}
      <div className="mb-3 rounded-xl bg-[#fafafa] border border-[#e5e5e5] p-2">
        {loading ? (
          <div className="flex h-9 items-center justify-center">
            <svg className="h-5 w-5 animate-spin text-[#737373]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <canvas ref={canvasRef} className="block h-9 w-full" />
        )}
      </div>

      {/* Buttons */}
      {!loading && (
        <div className="relative flex items-center justify-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={handleStop}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e5e5] bg-white transition-colors hover:bg-[#fafafa]"
            title="Stop & Transcribe"
          >
            <div className="h-4 w-4 rounded-sm bg-red-600" />
          </button>
          <button
            onClick={handleCancel}
            className="absolute right-0 text-[13px] text-[#737373] transition-colors hover:text-[#171717]"
            title="Cancel Recording"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
