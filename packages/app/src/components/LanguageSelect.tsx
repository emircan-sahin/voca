import { LANGUAGES } from '@voca/shared';
import { useLanguageStore } from '~/stores/language.store';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';

export const LanguageSelect = () => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <Select value={language} onValueChange={setLanguage}>
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
  );
};
