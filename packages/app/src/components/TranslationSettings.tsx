import { Switch, Label, Checkbox } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';
import { LANGUAGES, TranslationTone } from '@voca/shared';
import { useTranslationStore } from '~/stores/translation.store';

const TONES: { value: TranslationTone; label: string }[] = [
  { value: 'developer', label: 'Developer' },
  { value: 'personal', label: 'Personal' },
];

export const TranslationSettings = () => {
  const {
    enabled, targetLanguage, tone, numeric, planning,
    setEnabled, setTargetLanguage, setTone, setNumeric, setPlanning,
  } = useTranslationStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="translation-toggle" className="text-sm cursor-pointer">
          Enable Translation
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
              <label className="text-sm text-[#737373]">Target Language</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="w-64 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[#737373]">Tone</label>
              <Select value={tone} onValueChange={(v) => setTone(v as TranslationTone)}>
                <SelectTrigger className="w-64 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="numeric-toggle"
                checked={numeric}
                onCheckedChange={(v) => setNumeric(v === true)}
              />
              <Label htmlFor="numeric-toggle" className="text-sm cursor-pointer">
                Numeric
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="planning-toggle"
                checked={planning}
                onCheckedChange={(v) => setPlanning(v === true)}
              />
              <Label htmlFor="planning-toggle" className="text-sm cursor-pointer">
                Planning
              </Label>
            </div>
          </div>

          <p className="text-xs text-[#a3a3a3]">
            Automatically translate transcriptions using Gemini 2.0 Flash
          </p>
        </>
      )}
    </div>
  );
};
