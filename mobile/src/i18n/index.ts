import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
const initialLanguage = (supportedCodes as string[]).includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// Restore a language the user picked explicitly, once storage is available
// (overrides the device-locale guess used above at cold start).
AsyncStorage.getItem('appLanguage').then((saved) => {
  if (saved && (supportedCodes as string[]).includes(saved) && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  }
});

export const changeAppLanguage = async (code: LanguageCode) => {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem('appLanguage', code);
};

export default i18n;
