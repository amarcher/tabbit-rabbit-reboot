import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import es from './es.json';

const LANGUAGE_KEY = 'tabbitrabbit:language';

async function getStoredLanguage(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored) return stored;
  } catch {}
  const locales = getLocales();
  return locales[0]?.languageCode || 'en';
}

getStoredLanguage().then((lng) => {
  i18n.changeLanguage(lng);
});

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: 'en', // sync default, async override above
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
