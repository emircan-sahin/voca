import { useTranslation } from 'react-i18next';
import { Switch, Label, Checkbox } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from 'poyraz-ui/molecules';
import { LANGUAGES, TranslationTone } from '@voca/shared';
import { useTranslationStore } from '~/stores/translation.store';

export const TranslationSettings = () => {
  const { t } = useTranslation();
  const {
    enabled, targetLanguage, tone, numeric, planning,
    setEnabled, setTargetLanguage, setTone, setNumeric, setPlanning,
  } = useTranslationStore();

  const TONES: { value: TranslationTone; label: string }[] = [
    { value: 'developer', label: t('settings.toneDeveloper') },
    { value: 'personal', label: t('settings.tonePersonal') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="translation-toggle" className="text-sm cursor-pointer">
          {t('settings.enableTranslation')}
        </Label>
        <Switch
          id="translation-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <label className="text-sm text-[#737373]">{t('settings.targetLanguage')}</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="w-64 text-sm">
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
              <label className="text-sm text-[#737373]">{t('settings.tone')}</label>
              <Select value={tone} onValueChange={(v) => setTone(v as TranslationTone)}>
                <SelectTrigger className="w-64 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((toneItem) => (
                    <SelectItem key={toneItem.value} value={toneItem.value}>
                      {toneItem.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="numeric-toggle"
                  checked={numeric}
                  onCheckedChange={(v) => setNumeric(v === true)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="numeric-toggle"
                      className="text-sm cursor-pointer border-b border-dashed border-[#a3a3a3]"
                    >
                      {t('settings.numeric')}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings.numericTooltip')}</p>
                    <p className="text-[#a3a3a3]">{t('settings.numericExample')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="planning-toggle"
                  checked={planning}
                  onCheckedChange={(v) => setPlanning(v === true)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="planning-toggle"
                      className="text-sm cursor-pointer border-b border-dashed border-[#a3a3a3]"
                    >
                      {t('settings.planning')}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('settings.planningTooltip')}</p>
                    <p className="text-[#a3a3a3]">{t('settings.planningExample')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>

          <p className="text-xs text-[#a3a3a3]">
            {t('settings.translationNote')}
          </p>
        </>
      )}
    </div>
  );
};
