import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LOCALES } from '~/i18n/types';

import en from '~/i18n/locales/en.json';
import es from '~/i18n/locales/es.json';
import hi from '~/i18n/locales/hi.json';
import zh from '~/i18n/locales/zh.json';
import de from '~/i18n/locales/de.json';
import pt from '~/i18n/locales/pt.json';
import ja from '~/i18n/locales/ja.json';
import fr from '~/i18n/locales/fr.json';
import tr from '~/i18n/locales/tr.json';
import ru from '~/i18n/locales/ru.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi },
  zh: { translation: zh },
  de: { translation: de },
  pt: { translation: pt },
  ja: { translation: ja },
  fr: { translation: fr },
  tr: { translation: tr },
  ru: { translation: ru },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: [...LOCALES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'voca-locale',
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
