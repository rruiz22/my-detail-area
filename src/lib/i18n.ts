import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Language resources will be loaded dynamically
const resources = {};

i18n
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('language') || 'en', // default language
    fallbackLng: 'en',
    resources,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

// Dynamically load translation files
const loadLanguage = async (language: string) => {
  try {
    const response = await fetch(`/translations/${language}.json`);
    const translations = await response.json();
    
    if (!i18n.hasResourceBundle(language, 'translation')) {
      i18n.addResourceBundle(language, 'translation', translations);
    }
    
    return translations;
  } catch (error) {
    console.error(`Failed to load language ${language}:`, error);
    return null;
  }
};

// Load initial language
loadLanguage(i18n.language);

export const changeLanguage = async (language: string) => {
  await loadLanguage(language);
  await i18n.changeLanguage(language);
  localStorage.setItem('language', language);
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
];

export default i18n;