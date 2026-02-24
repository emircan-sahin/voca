export const LOCALES = ['en', 'es', 'hi', 'zh', 'de', 'pt', 'ja', 'fr', 'tr', 'ru', 'ko', 'it'] as const;
export type Locale = (typeof LOCALES)[number];
