import { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ORIGINAL = 'We\'ve been recieving alot of complains about the irregardless pricing';
const CORRECTIONS: { wrong: string; right: string }[] = [
  { wrong: 'recieving', right: 'receiving' },
  { wrong: 'alot', right: 'a lot' },
  { wrong: 'complains', right: 'complaints' },
  { wrong: 'irregardless', right: 'regardless' },
];
const CORRECTED = 'We\'ve been receiving a lot of complaints about the regardless pricing';

const TYPING_SPEED = 35;
const PAUSE_AFTER_TYPING = 1200;
const CORRECTION_DELAY = 600;
const DISPLAY_DURATION = 3000;

export default function CorrectionDemo() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'typing' | 'processing' | 'corrected' | 'done'>('typing');
  const [typed, setTyped] = useState('');
  const [correctionIndex, setCorrectionIndex] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Typing phase
  useEffect(() => {
    if (phase !== 'typing') return;
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setTyped(ORIGINAL.slice(0, i));
      if (i >= ORIGINAL.length) {
        clearInterval(intervalRef.current!);
        setTimeout(() => setPhase('processing'), PAUSE_AFTER_TYPING);
      }
    }, TYPING_SPEED);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  // Processing → corrected
  useEffect(() => {
    if (phase !== 'processing') return;
    const timer = setTimeout(() => {
      setPhase('corrected');
      setCorrectionIndex(0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Animate corrections one by one
  useEffect(() => {
    if (phase !== 'corrected') return;
    if (correctionIndex >= CORRECTIONS.length) {
      const timer = setTimeout(() => setPhase('done'), CORRECTION_DELAY);
      return () => clearTimeout(timer);
    }
    if (correctionIndex < 0) return;
    const timer = setTimeout(() => {
      setCorrectionIndex((i) => i + 1);
    }, CORRECTION_DELAY);
    return () => clearTimeout(timer);
  }, [phase, correctionIndex]);

  // Reset loop
  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => {
      setTyped('');
      setCorrectionIndex(-1);
      setPhase('typing');
    }, DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [phase]);

  function renderOriginal() {
    if (phase === 'typing') {
      return (
        <>
          {typed}
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />
        </>
      );
    }

    const text = ORIGINAL;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    CORRECTIONS.forEach((c, i) => {
      const idx = text.indexOf(c.wrong, lastIndex);
      if (idx === -1) return;
      if (idx > lastIndex) {
        parts.push(<span key={`t-${i}`}>{text.slice(lastIndex, idx)}</span>);
      }
      const isRevealed = phase === 'corrected' || phase === 'done';
      parts.push(
        <span
          key={`w-${i}`}
          className={isRevealed ? 'correction-underline text-red-500' : ''}
        >
          {c.wrong}
        </span>,
      );
      lastIndex = idx + c.wrong.length;
    });
    if (lastIndex < text.length) {
      parts.push(<span key="rest">{text.slice(lastIndex)}</span>);
    }
    return parts;
  }

  function renderCorrected() {
    const text = CORRECTED;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    CORRECTIONS.forEach((c, i) => {
      const idx = text.indexOf(c.right, lastIndex);
      if (idx === -1) return;
      if (idx > lastIndex) {
        parts.push(<span key={`t-${i}`}>{text.slice(lastIndex, idx)}</span>);
      }
      const isVisible = i < correctionIndex;
      parts.push(
        <span
          key={`c-${i}`}
          className={`inline-block transition-all duration-300 ${
            isVisible
              ? 'text-green-600 opacity-100'
              : 'text-green-600 opacity-0 blur-sm'
          }`}
        >
          {c.right}
        </span>,
      );
      lastIndex = idx + c.right.length;
    });
    if (lastIndex < text.length) {
      parts.push(<span key="rest">{text.slice(lastIndex)}</span>);
    }
    return parts;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[11px] font-medium text-neutral-400">Voca</span>
        <div className="w-10" />
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        {/* Original */}
        <div className="rounded-lg bg-neutral-50 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Mic className="h-3 w-3 text-neutral-400" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              {t('correctionDemo.youSaid')}
            </span>
            {phase === 'typing' && (
              <span className="ml-auto flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 animate-[pulse-dot_1.4s_ease-in-out_infinite] rounded-full bg-red-500" />
                <span className="h-1.5 w-1.5 animate-[pulse-dot_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-red-500" />
                <span className="h-1.5 w-1.5 animate-[pulse-dot_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-red-500" />
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-neutral-600">
            &ldquo;{renderOriginal()}&rdquo;
          </p>
        </div>

        {/* Arrow / processing */}
        <div className="flex items-center justify-center py-1">
          {phase === 'processing' ? (
            <div className="flex items-center gap-2 text-[11px] font-medium text-red-500">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{t('correctionDemo.correcting')}</span>
            </div>
          ) : (
            <div className={`h-5 w-px transition-colors duration-300 ${
              phase === 'corrected' || phase === 'done' ? 'bg-green-300' : 'bg-slate-200'
            }`} />
          )}
        </div>

        {/* Corrected */}
        <div
          className={`rounded-lg border px-4 py-3 transition-all duration-500 ${
            phase === 'corrected' || phase === 'done'
              ? 'border-green-200 bg-green-50/60 opacity-100'
              : 'border-slate-100 bg-slate-50/50 opacity-40'
          }`}
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className={`h-3 w-3 transition-colors duration-300 ${
              phase === 'corrected' || phase === 'done' ? 'text-green-500' : 'text-neutral-300'
            }`} />
            <span className={`text-[11px] font-medium uppercase tracking-wider transition-colors duration-300 ${
              phase === 'corrected' || phase === 'done' ? 'text-green-500' : 'text-neutral-300'
            }`}>
              {t('correctionDemo.aiCorrected')}
            </span>
            {(phase === 'corrected' || phase === 'done') && correctionIndex >= CORRECTIONS.length && (
              <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                {t('correctionDemo.fixes', { count: CORRECTIONS.length })}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-neutral-600">
            &ldquo;{phase === 'corrected' || phase === 'done' ? renderCorrected() : CORRECTED}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
