export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  // Top languages
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Turkish' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'hi', name: 'Hindi' },
  // Remaining alphabetically
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'el', name: 'Greek' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'ms', name: 'Malay' },
  { code: 'no', name: 'Norwegian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'th', name: 'Thai' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as unknown as readonly [
  'en', 'tr', 'de', 'fr', 'es', 'pt', 'ja', 'ko', 'zh', 'ar',
  'ru', 'it', 'nl', 'pl', 'hi', 'bg', 'ca', 'cs', 'da', 'el',
  'et', 'fi', 'hu', 'id', 'lv', 'lt', 'ms', 'no', 'ro', 'sk',
  'sl', 'sv', 'th', 'uk', 'vi',
];

export const TONES = ['developer', 'personal'] as const;

export type TranslationTone = (typeof TONES)[number];
