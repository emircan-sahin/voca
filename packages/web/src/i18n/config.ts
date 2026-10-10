import i18n from 'i18next';
import type { BackendModule, ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LOCALES } from '~/i18n/types';

import en from '~/i18n/locales/en.json';

export const LOCALE_STORAGE_KEY = 'voca-locale';

// Only the English fallback ships in the main bundle; other locales are fetched on demand
const localeLoaders = Object.fromEntries(
  Object.entries(
    import.meta.glob<ResourceKey>(['~/i18n/locales/*.json', '!~/i18n/locales/en.json'], { import: 'default' }),
  ).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), load]),
);

const lazyLocales: BackendModule = {
  type: 'backend',
  init() {},
  read(language, _namespace, callback) {
    const load = localeLoaders[language];
    if (!load) return callback(new Error(`Unknown locale: ${language}`), false);
    load().then(
      (resources) => callback(null, resources),
      (err: Error) => callback(err, false),
    );
  },
};

// Registered before init: the detected language is applied during init and would be missed otherwise
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

i18n
  .use(lazyLocales)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    supportedLngs: [...LOCALES],
    interpolation: { escapeValue: false },
    detection: {
      // A /<locale>/ URL prefix wins; unprefixed URLs fall back to the saved choice, then the browser
      order: ['path', 'localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      // Only the switcher saves a choice: opening one shared /tr/ link shouldn't make the root Turkish
      caches: [],
    },
  });

export default i18n;
