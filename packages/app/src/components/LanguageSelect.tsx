import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-64 text-sm" aria-label={t('settings.language')}>
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
