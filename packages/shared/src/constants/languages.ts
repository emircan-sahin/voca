export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  // Top languages
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  // Remaining alphabetically
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as unknown as readonly [
  'en', 'tr', 'de', 'fr', 'es', 'pt', 'ja', 'ko', 'zh', 'ar',
  'ru', 'it', 'nl', 'pl', 'hi', 'bg', 'ca', 'cs', 'da', 'el',
  'et', 'fi', 'hu', 'id', 'lv', 'lt', 'ms', 'no', 'ro', 'sk',
  'sl', 'sv', 'th', 'uk', 'vi',
];

export const TONES = ['developer', 'personal'] as const;

export type TranslationTone = (typeof TONES)[number];
