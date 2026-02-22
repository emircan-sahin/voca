import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Mic } from 'lucide-react';
import { useMicrophoneStore } from '~/stores/microphone.store';
import { Button } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';

const DEFAULT_SENTINEL = 'default';

interface MicrophoneSelectProps {
  className?: string;
}

export const MicrophoneSelect = ({ className }: MicrophoneSelectProps) => {
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
      setDevices(all.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default'));
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

  const selectValue = deviceId || DEFAULT_SENTINEL;

  const handleValueChange = (value: string) => {
    setDeviceId(value === DEFAULT_SENTINEL ? '' : value);
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="relative w-64">
        <Select value={selectValue} onValueChange={handleValueChange}>
          <SelectTrigger className="w-64 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_SENTINEL}>Default</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone (${d.deviceId.slice(0, 8)}…)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {testing && (
          <div className="absolute left-0 right-0 top-full mt-0.5 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
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

      <Button
        variant="ghost"
        onClick={testing ? stopTest : startTest}
        className={testing ? 'text-red-600 hover:text-red-700' : 'text-[#737373]'}
      >
        <Mic size={14} />
        {testing ? 'Stop' : 'Test'}
      </Button>
    </div>
  );
};
