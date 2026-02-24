export const LOCALES = ['en', 'es', 'hi', 'zh', 'de', 'pt', 'ja', 'fr', 'tr', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
