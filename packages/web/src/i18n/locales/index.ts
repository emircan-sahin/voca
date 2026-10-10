import type { Locale } from '~/i18n/types';

export const LOCALE_META: Record<Locale, { flag: string; name: string; ogLocale: string }> = {
  en: { flag: '🇬🇧', name: 'English', ogLocale: 'en_US' },
  es: { flag: '🇪🇸', name: 'Español', ogLocale: 'es_ES' },
  hi: { flag: '🇮🇳', name: 'हिन्दी', ogLocale: 'hi_IN' },
  zh: { flag: '🇨🇳', name: '中文', ogLocale: 'zh_CN' },
  de: { flag: '🇩🇪', name: 'Deutsch', ogLocale: 'de_DE' },
  pt: { flag: '🇧🇷', name: 'Português', ogLocale: 'pt_BR' },
  ja: { flag: '🇯🇵', name: '日本語', ogLocale: 'ja_JP' },
  fr: { flag: '🇫🇷', name: 'Français', ogLocale: 'fr_FR' },
  tr: { flag: '🇹🇷', name: 'Türkçe', ogLocale: 'tr_TR' },
  ru: { flag: '🇷🇺', name: 'Русский', ogLocale: 'ru_RU' },
  ko: { flag: '🇰🇷', name: '한국어', ogLocale: 'ko_KR' },
  it: { flag: '🇮🇹', name: 'Italiano', ogLocale: 'it_IT' },
};
