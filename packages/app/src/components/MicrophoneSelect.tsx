import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Mic } from 'lucide-react';
import { useMicrophoneStore } from '~/stores/microphone.store';

export const MicrophoneSelect = () => {
  const { deviceId, setDeviceId } = useMicrophoneStore();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const loadDevices = async () => {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    };

    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, []);

  const stopTest = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setLevel(0);
    setTesting(false);
  }, []);

  const startTest = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    streamRef.current = s;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(s);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(avg / 128, 1));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    setTesting(true);
  }, [deviceId]);

  // Stop test when deviceId changes or component unmounts
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (testing) {
      stopTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative inline-block">
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="appearance-none bg-gray-800/80 text-sm text-gray-300 border border-gray-700/50 rounded-lg pl-3 pr-8 py-1.5 cursor-pointer hover:bg-gray-700/80 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-gray-600"
        >
          <option value="">Default</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone (${d.deviceId.slice(0, 8)}…)`}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      </div>

      <button
        type="button"
        onClick={testing ? stopTest : startTest}
        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
          testing
            ? 'text-red-400 hover:text-red-300'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Mic size={10} />
        {testing ? 'Stop' : 'Test'}
      </button>

      {testing && (
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${level * 100}%`,
              backgroundColor: level > 0.7 ? '#ef4444' : level > 0.35 ? '#eab308' : '#22c55e',
            }}
          />
        </div>
      )}
    </div>
  );
};
