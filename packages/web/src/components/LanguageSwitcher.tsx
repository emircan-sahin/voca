import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'poyraz-ui/molecules';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { LOCALES } from '~/i18n';
import type { Locale } from '~/i18n';
import { LOCALE_STORAGE_KEY } from '~/i18n/config';
import { LOCALE_META } from '~/i18n/locales';
import { localizePath, parseLocalePath } from '~/i18n/routing';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const locale = (i18n.resolvedLanguage ?? 'en') as Locale;
  const meta = LOCALE_META[locale] ?? LOCALE_META.en;

  const switchTo = (next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the URL prefix still carries the choice
    }
    // The English URLs have no prefix, so the language can't be read from the URL there
    i18n.changeLanguage(next);
    navigate(localizePath(parseLocalePath(pathname).path, next) + hash, { state: { keepScroll: true } });
  };

  return (
    <Select value={locale} onValueChange={(v) => switchTo(v as Locale)}>
      <SelectTrigger aria-label={t('navbar.language')} className="w-[140px] gap-1.5 text-sm">
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
