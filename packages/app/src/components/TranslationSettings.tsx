import { Switch, Label } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';
import { useTranslationStore, TranslationTone } from '~/stores/translation.store';
import { LANGUAGES } from '~/stores/language.store';

const TONES: { value: TranslationTone; label: string }[] = [
  { value: 'developer', label: 'Developer' },
  { value: 'personal', label: 'Personal' },
];

export const TranslationSettings = () => {
  const { enabled, targetLanguage, tone, setEnabled, setTargetLanguage, setTone } =
    useTranslationStore();

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

          <p className="text-xs text-[#a3a3a3]">
            Automatically translate transcriptions using Gemini 2.5 Flash
          </p>
        </>
      )}
    </div>
  );
};
