import { useEffect, useRef, useState, useCallback } from 'react';

const BAR_COUNT = 48;
const LERP = 0.18;
const ACCENT = '#dc2626';

export function RecordingOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentHeights = useRef(new Float32Array(BAR_COUNT));
  const targetHeights = useRef(new Float32Array(BAR_COUNT));
  const latestData = useRef<number[]>(new Array(64).fill(0));
  const rafRef = useRef(0);
  const startTime = useRef(Date.now());
  const [timer, setTimer] = useState('00:00');

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startTime.current) / 1000);
      setTimer(
        String(Math.floor(s / 60)).padStart(2, '0') + ':' +
        String(s % 60).padStart(2, '0')
      );
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Audio data listener
  useEffect(() => {
    const cleanup = window.electronAPI.onAudioData((data) => {
      latestData.current = data;
    });
    return cleanup;
  }, []);

  // Waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const t = Date.now() / 1000;
      const data = latestData.current;

      for (let i = 0; i < BAR_COUNT; i++) {
        const idx = Math.floor((i / BAR_COUNT) * data.length);
        const audioVal = (data[idx] || 0) / 255;

        const idle =
          0.08 +
          0.06 * Math.sin(t * 2.5 + i * 0.4) +
          0.04 * Math.sin(t * 1.7 + i * 0.7);

        targetHeights.current[i] = Math.max(idle, audioVal);
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
    <div className="animate-slide-down mx-auto mt-2 w-[320px] rounded-2xl border border-gray-700/50 p-4 shadow-2xl"
      style={{
        background: 'rgba(17, 24, 39, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          <span className="text-[13px] font-semibold text-white">Recording</span>
        </div>
        <span className="font-mono text-[13px] text-gray-400">{timer}</span>
      </div>

      {/* Waveform */}
      <div className="mb-3 rounded-xl bg-gray-800/60 p-2">
        <canvas ref={canvasRef} className="block h-9 w-full" />
      </div>

      {/* Buttons */}
      <div className="relative flex items-center justify-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleStop}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-700/50 bg-gray-800 transition-colors hover:bg-gray-700"
          title="Stop & Transcribe"
        >
          <div className="h-4 w-4 rounded-sm bg-red-600" />
        </button>
        <button
          onClick={handleCancel}
          className="absolute right-0 text-[13px] text-gray-400 transition-colors hover:text-white"
          title="Cancel Recording"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
