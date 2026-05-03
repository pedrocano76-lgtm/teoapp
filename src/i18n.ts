import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    nonExplicitSupportedLngs: true, // map "es-ES" -> "es"
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
  });

export const getLocale = () => (i18n.language?.startsWith('es') ? 'es-ES' : 'en-US');
export const getDateFnsLocale = async () => {
  if (i18n.language?.startsWith('es')) {
    const m = await import('date-fns/locale/es');
    return m.es;
  }
  const m = await import('date-fns/locale/en-US');
  return m.enUS;
};

export default i18n;
