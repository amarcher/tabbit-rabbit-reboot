import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import hi from './hi.json';
import pt from './pt.json';
import ko from './ko.json';
import ja from './ja.json';
import zh from './zh.json';
import de from './de.json';
import ru from './ru.json';
import fr from './fr.json';
import it from './it.json';
import vi from './vi.json';

const SUPPORTED_LANGS = ['en', 'es', 'hi', 'pt', 'ko', 'ja', 'zh', 'de', 'ru', 'fr', 'it', 'vi'];

function detectLanguage(): string {
  const stored = localStorage.getItem('tabbitrabbit:language');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && SUPPORTED_LANGS.includes(browserLang)) return browserLang;
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en }, es: { translation: es },
    hi: { translation: hi }, pt: { translation: pt },
    ko: { translation: ko }, ja: { translation: ja },
    zh: { translation: zh }, de: { translation: de },
    ru: { translation: ru }, fr: { translation: fr },
    it: { translation: it }, vi: { translation: vi },
  },
  supportedLngs: SUPPORTED_LANGS,
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Typed translation helper for use outside React components (e.g. in context files). */
export function tStatic(key: string, options?: Record<string, unknown>): string {
  return (i18n.t as (key: string, options?: Record<string, unknown>) => string)(key, options);
}

export default i18n;
