import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DEADLINE = new Date('2026-03-08T00:00:00Z').getTime();
const TOTAL_DURATION = 7 * 24 * 60 * 60 * 1000;

function useCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, DEADLINE - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const progress = Math.max(0, Math.min(100, (diff / TOTAL_DURATION) * 100));

  return { d, h, m, s, progress, expired: diff <= 0 };
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono">
      <span className="rounded bg-white/20 px-1.5 py-0.5 text-sm font-bold tabular-nums text-black">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] text-white/90">{label}</span>
    </span>
  );
}

export default function PromoBanner() {
  const { t } = useTranslation();
  const { d, h, m, s, progress, expired } = useCountdown();

  if (expired) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-rose-500 to-orange-500">
      <div className="relative z-10 flex flex-col items-center gap-1 px-4 py-2">
        <span className="text-sm font-medium text-white text-center">{t('banner.promo')}</span>
        <div className="flex items-center gap-1.5">
          <TimeBlock value={d} label="d" />
          <span className="text-white/90 text-xs font-bold">:</span>
          <TimeBlock value={h} label="h" />
          <span className="text-white/90 text-xs font-bold">:</span>
          <TimeBlock value={m} label="m" />
          <span className="text-white/90 text-xs font-bold">:</span>
          <TimeBlock value={s} label="s" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/10">
        <div
          className="h-full bg-white/40 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
