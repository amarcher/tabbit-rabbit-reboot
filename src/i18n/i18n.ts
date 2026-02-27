import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: localStorage.getItem('tabbitrabbit:language') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Typed translation helper for use outside React components (e.g. in context files). */
export function tStatic(key: string, options?: Record<string, unknown>): string {
  return (i18n.t as (key: string, options?: Record<string, unknown>) => string)(key, options);
}

export default i18n;
