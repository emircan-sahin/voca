import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Mic, Square } from 'lucide-react';
import { Button, Label, Textarea } from 'poyraz-ui/atoms';
import { ITranscript } from '@voca/shared';
import { formatKeyLabel } from '~/components/ShortcutSettings';
import { useShortcutStore } from '~/stores/shortcut.store';

interface OnboardingTryStepProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  transcripts: ITranscript[];
}

const KeyCap = ({ children }: { children: string }) => (
  <kbd className="inline-flex h-8 min-w-[32px] items-center justify-center border border-dashed border-slate-300 bg-white px-2.5 text-sm font-medium text-[#171717] rounded">
    {children}
  </kbd>
);

export const OnboardingTryStep = ({ isRecording, isProcessing, onToggle, transcripts }: OnboardingTryStepProps) => {
  const { t } = useTranslation();
  const config = useShortcutStore((s) => s.config);
  const load = useShortcutStore((s) => s.load);
  const [value, setValue] = useState('');
  const [tried, setTried] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viaButton = useRef(false);
  const latest = transcripts[0];
  // Anything already in History when this step opens must not count as a successful try
  const baselineId = useRef(latest?.id);

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  // The auto-paste targets whichever field has focus, so keep it on the textarea
  useEffect(() => {
    if (!isProcessing) textareaRef.current?.focus();
  }, [isProcessing]);

  // Button recordings are not auto-pasted, so show their result in the textarea ourselves
  useEffect(() => {
    if (!latest || latest.id === baselineId.current) return;
    baselineId.current = latest.id;
    if (viaButton.current) {
      viaButton.current = false;
      setValue((v) => v || (latest.translatedText ?? latest.text));
    }
    setTried(true);
  }, [latest]);

  const handleButton = () => {
    if (!isRecording) viaButton.current = true;
    onToggle();
  };

  const toggle = config?.['toggle-recording'];
  const cancel = config?.['cancel-recording'];
  const success = tried || value.trim() !== '';
  const buttonLabel = isProcessing
    ? t('dashboard.processing')
    : isRecording
    ? t('mic.stop')
    : t('onboarding.try.record');

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-[#171717]">{t('onboarding.try.title')}</h2>
        {toggle?.enabled ? (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737373]">{t('shortcuts.startStop')}</span>
              <KeyCap>{formatKeyLabel(toggle.label)}</KeyCap>
            </div>
            {cancel?.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#737373]">{t('shortcuts.cancel')}</span>
                <KeyCap>{formatKeyLabel(cancel.label)}</KeyCap>
              </div>
            )}
          </div>
        ) : (
          config && <p className="text-sm text-[#737373]">{t('onboarding.try.noShortcut')}</p>
        )}
      </div>

      <ol className="space-y-2">
        {(['step1', 'step2', 'step3'] as const).map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm text-[#171717]">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-dashed border-slate-300 text-xs text-[#737373]">
              {i + 1}
            </span>
            {t(`onboarding.try.${step}`)}
          </li>
        ))}
      </ol>
      <p className="text-xs text-[#737373]">{t('onboarding.try.holdHint')}</p>

      <div className="space-y-1">
        <Label htmlFor="onboarding-try" className="text-xs text-[#737373]">
          {t('onboarding.try.label')}
        </Label>
        <Textarea
          id="onboarding-try"
          ref={textareaRef}
          autoFocus
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('onboarding.try.placeholder')}
          className="w-full resize-none text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-4 min-h-8">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">{t('onboarding.try.or')}</span>
          {/* mousedown default would move focus off the textarea, which the paste needs */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleButton}
            onMouseDown={(e) => e.preventDefault()}
            disabled={isProcessing}
            aria-busy={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : isRecording ? (
              <Square className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Mic className="mr-1.5 h-3.5 w-3.5" />
            )}
            {buttonLabel}
          </Button>
        </div>
        {success && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600" aria-live="polite">
            <Check className="h-4 w-4" />
            {t('onboarding.try.success')}
          </p>
        )}
      </div>
    </div>
  );
};
