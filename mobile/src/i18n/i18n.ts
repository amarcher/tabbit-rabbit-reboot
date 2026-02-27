import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import es from './es.json';

const LANGUAGE_KEY = 'tabbitrabbit:language';
const SUPPORTED_LANGS = ['en', 'es'];

// Use synchronous device locale as initial default (avoids flash of English)
const deviceLang = getLocales()[0]?.languageCode || 'en';
const syncDefault = SUPPORTED_LANGS.includes(deviceLang) ? deviceLang : 'en';

// Override with stored user preference if it differs
AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
  if (stored && SUPPORTED_LANGS.includes(stored) && stored !== i18n.language) {
    i18n.changeLanguage(stored);
  }
}).catch(() => {});

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  supportedLngs: SUPPORTED_LANGS,
  lng: syncDefault,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
