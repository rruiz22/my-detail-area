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
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Validate JSON before parsing
    if (!text.trim()) {
      throw new Error('Empty response received');
    }
    
    // Try to parse JSON with better error handling
    let translations;
    try {
      translations = JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parse error in ${language}.json:`, parseError);
      console.error('Response text length:', text.length);
      console.error('First 100 chars:', text.substring(0, 100));
      console.error('Last 100 chars:', text.substring(text.length - 100));
      throw new Error(`Invalid JSON in ${language}.json: ${parseError.message}`);
    }
    
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
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'pt-BR', name: 'Português (BR)', flag: 'BR' },
];

export default i18n;