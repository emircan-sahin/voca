import { useLocation } from 'react-router-dom';
import { LOCALES } from '~/i18n/types';
import type { Locale } from '~/i18n/types';

export const SITE_URL = 'https://usevoca.dev';

// English lives at the root; every other locale is served under /<locale>/
const PREFIXED_LOCALES: readonly string[] = LOCALES.filter((l) => l !== 'en');

/** "/tr/privacy/" → { locale: 'tr', path: '/privacy' }. Unprefixed paths are the English URLs. */
export function parseLocalePath(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  const prefixed = PREFIXED_LOCALES.includes(first);
  const path = prefixed ? `/${rest.join('/')}` : pathname;
  return {
    locale: prefixed ? (first as Locale) : 'en',
    path: path.replace(/\/+$/, '') || '/',
  };
}

/** "/privacy" → "/tr/privacy", "/" → "/tr/", "/#faq" → "/tr/#faq"; English stays unprefixed. */
export function localizePath(path: string, locale: Locale): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** Maps internal links to the current URL's locale, so navigation never drops the language prefix. */
export function useLocalizedPath() {
  const { locale } = parseLocalePath(useLocation().pathname);
  return (path: string) => localizePath(path, locale);
}
