import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Settings, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, Label, Switch } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';
import { DEFAULT_USER_SETTINGS, ITranscript, LANGUAGES, LANGUAGE_CODES, TranslationTone } from '@voca/shared';
import { LanguageSelect } from '~/components/LanguageSelect';
import { OnboardingTryStep } from '~/components/OnboardingTryStep';
import { useAuthStore } from '~/stores/auth.store';
import { useLanguageStore } from '~/stores/language.store';
import { useOnboardingStore } from '~/stores/onboarding.store';
import { useProgramLanguageStore } from '~/stores/programLanguage.store';
import { useTranslationStore } from '~/stores/translation.store';
import vocaLogo from '~/assets/voca_logo.png';

interface OnboardingWizardProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  transcripts: ITranscript[];
}

const STEPS = ['welcome', 'language', 'translation', 'try', 'done'] as const;
const LAST = STEPS.length - 1;

const TranslationStep = () => {
  const { t } = useTranslation();
  const { enabled, targetLanguage, tone, setEnabled, setTargetLanguage, setTone } = useTranslationStore();
  const tones: { value: TranslationTone; label: string }[] = [
    { value: 'developer', label: t('settings.toneDeveloper') },
    { value: 'personal', label: t('settings.tonePersonal') },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-[#171717]">{t('onboarding.translation.title')}</h2>
        <p className="text-sm text-[#737373]">{t('onboarding.translation.hint')}</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Switch id="onboarding-translate" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="onboarding-translate" className="text-sm cursor-pointer">
          {t('onboarding.translation.toggle')}
        </Label>
      </div>
      {enabled && (
        <div className="flex items-start justify-center gap-4">
          <div className="space-y-1">
            <label className="text-xs text-[#737373]">{t('settings.targetLanguage')}</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-64 text-sm" aria-label={t('settings.targetLanguage')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#737373]">{t('settings.tone')}</label>
            <Select value={tone} onValueChange={(v) => setTone(v as TranslationTone)}>
              <SelectTrigger className="w-64 text-sm" aria-label={t('settings.tone')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tones.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#a3a3a3]">{t('onboarding.translation.toneHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const OnboardingWizard = ({ isRecording, isProcessing, onToggle, transcripts }: OnboardingWizardProps) => {
  const { t } = useTranslation();
  const complete = useOnboardingStore((s) => s.complete);
  const settingsHydrated = useAuthStore((s) => s.settingsHydrated);
  const [step, setStep] = useState(0);

  // Preselect the app's UI language as the speech language, but only after the server
  // settings are applied: an earlier write would be overwritten by hydration.
  useEffect(() => {
    if (!settingsHydrated) return;
    const { language, setLanguage } = useLanguageStore.getState();
    const { programLanguage } = useProgramLanguageStore.getState();
    if (language === DEFAULT_USER_SETTINGS.language && LANGUAGE_CODES.includes(programLanguage)) {
      setLanguage(programLanguage);
    }
  }, [settingsHydrated]);

  const handleNext = () => (step === LAST ? complete() : setStep(step + 1));
  const nextRef = useRef(handleNext);
  nextRef.current = handleNext;

  // Enter = Next, except where Enter already means something (textarea, buttons, selects)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (e.target instanceof Element && e.target.closest('textarea, button, a, [role="combobox"], [role="listbox"]')) return;
      nextRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tips = [
    { icon: History, title: t('sidebar.history'), desc: t('onboarding.done.history') },
    { icon: Settings, title: t('sidebar.settings'), desc: t('onboarding.done.settings') },
    { icon: ShieldCheck, title: t('settings.privacyMode'), desc: t('onboarding.done.privacy') },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.title')}
      // z-50 max: Radix Select popovers portal at z-50 and must stay above this layer
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#fafafa] p-6"
    >
      <Card variant="bordered" className="w-full max-w-2xl !border-dashed !border-[#e5e5e5] bg-white">
        <CardContent className="p-8">
          <div className="flex justify-end h-8 mb-2">
            {step < LAST && (
              <Button variant="ghost" size="sm" onClick={complete} className="text-xs text-[#737373]">
                {t('onboarding.skip')}
              </Button>
            )}
          </div>

          <div key={step} className="animate-slide-up min-h-[400px] flex flex-col justify-center">
            {step === 0 && (
              <div className="flex flex-col items-center text-center gap-3">
                <img src={vocaLogo} alt="Voca" className="w-16 h-16 rounded-full mb-2" />
                <h2 className="text-xl font-bold text-[#171717]">{t('onboarding.welcome.title')}</h2>
                <p className="max-w-md text-sm leading-relaxed text-[#737373]">{t('onboarding.welcome.body')}</p>
                <p className="text-xs text-[#a3a3a3]">{t('onboarding.welcome.hint')}</p>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col items-center text-center gap-5">
                <h2 className="text-lg font-semibold text-[#171717]">{t('onboarding.language.title')}</h2>
                <LanguageSelect />
                <p className="text-sm text-[#737373]">{t('onboarding.language.hint')}</p>
              </div>
            )}

            {step === 2 && <TranslationStep />}

            {step === 3 && (
              <OnboardingTryStep
                isRecording={isRecording}
                isProcessing={isProcessing}
                onToggle={onToggle}
                transcripts={transcripts}
              />
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-[#171717]">{t('onboarding.done.title')}</h2>
                  <p className="text-sm text-[#737373]">{t('onboarding.done.subtitle')}</p>
                </div>
                <div className="flex flex-col gap-3">
                  {tips.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 border border-dashed border-slate-300 p-4">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-dashed border-slate-300 bg-[#fafafa]">
                        <Icon className="h-4 w-4 text-[#737373]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#171717]">{title}</p>
                        <p className="mt-0.5 text-xs text-[#737373]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-slate-300 pt-4">
            <div className="w-24">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  {t('onboarding.back')}
                </Button>
              )}
            </div>
            <div
              role="group"
              aria-label={t('onboarding.progress', { current: step + 1, total: STEPS.length })}
              className="flex items-center gap-2"
            >
              {STEPS.map((name, i) => (
                <span
                  key={name}
                  aria-current={i === step ? 'step' : undefined}
                  className={`h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-red-600' : 'bg-[#e5e5e5]'}`}
                />
              ))}
            </div>
            <div className="flex w-24 justify-end">
              <Button size="sm" onClick={handleNext}>
                {step === LAST ? t('onboarding.start') : t('onboarding.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
