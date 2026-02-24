import type { Locale } from '~/i18n/types';

export const LOCALE_META: Record<Locale, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English' },
  es: { flag: '🇪🇸', name: 'Español' },
  hi: { flag: '🇮🇳', name: 'हिन्दी' },
  zh: { flag: '🇨🇳', name: '中文' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  pt: { flag: '🇧🇷', name: 'Português' },
  ja: { flag: '🇯🇵', name: '日本語' },
  fr: { flag: '🇫🇷', name: 'Français' },
  tr: { flag: '🇹🇷', name: 'Türkçe' },
  ru: { flag: '🇷🇺', name: 'Русский' },
  ko: { flag: '🇰🇷', name: '한국어' },
  it: { flag: '🇮🇹', name: 'Italiano' },
};
