import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'poyraz-ui/molecules';
import { useTranslation } from 'react-i18next';
import { LOCALES } from '~/i18n';
import type { Locale } from '~/i18n';
import { LOCALE_META } from '~/i18n/locales';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const meta = LOCALE_META[locale] ?? LOCALE_META.en;

  return (
    <Select value={locale} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-[140px] gap-1.5 text-sm">
        <SelectValue>
          {meta.flag} {meta.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l} className="text-sm">
            {LOCALE_META[l].flag} {LOCALE_META[l].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
