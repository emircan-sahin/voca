import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_LOCALES, AppLocale } from '@voca/shared';

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
import ko from '~/i18n/locales/ko.json';
import it from '~/i18n/locales/it.json';

const locales = new Set<string>(APP_LOCALES);

export function detectSystemLocale(): AppLocale {
  const raw = navigator.language.split('-')[0];
  return locales.has(raw) ? (raw as AppLocale) : 'en';
}

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
  ko: { translation: ko },
  it: { translation: it },
};

i18n.use(initReactI18next).init({
  resources,
  lng: detectSystemLocale(),
  fallbackLng: 'en',
  supportedLngs: [...APP_LOCALES],
  interpolation: { escapeValue: false },
});

export default i18n;
