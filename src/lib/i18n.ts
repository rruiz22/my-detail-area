import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation cache version - increment this when translations are updated
// This forces browsers to reload translation files
const TRANSLATION_VERSION = `1.6.2-${Date.now()}`; // v1.6.2: Fixed notifications conflict - moved channel_matrix to settings root

// ✅ PHASE 1.3: SessionStorage cache key for translations
const TRANSLATION_CACHE_KEY = 'i18n_translations_cache_v6'; // v6: Fixed settings.notifications object conflict

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

// Track if initial language is being loaded
let initialLanguageLoading: Promise<any> | null = null;

// ✅ PHASE 1.3: Load translation with sessionStorage cache for instant subsequent loads
const loadLanguage = async (language: string) => {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;

    // Try sessionStorage first (persists during browser session)
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const translations = JSON.parse(cached);
        if (!i18n.hasResourceBundle(language, 'translation')) {
          i18n.addResourceBundle(language, 'translation', translations);
        }
        console.log(`⚡ Translations loaded from cache for ${language}`);
        return translations;
      } catch (cacheError) {
        console.warn('Cache parse error, fetching fresh:', cacheError);
        sessionStorage.removeItem(cacheKey); // Clear corrupted cache
      }
    }

    // Fetch from network
    // Use version parameter to bust cache when translations are updated
    const response = await fetch(`/translations/${language}.json?v=${TRANSLATION_VERSION}` as string, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });

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

    // ✅ Cache in sessionStorage for instant subsequent loads
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(translations));
    } catch (storageError) {
      console.warn('Failed to cache translations (storage full?):', storageError);
    }

    console.log(`✅ Translations loaded for ${language}`);
    return translations;
  } catch (error) {
    console.error(`Failed to load language ${language}:`, error);
    return null;
  }
};

// ✅ PHASE 4.1: Preload user's preferred language IMMEDIATELY
// This starts loading BEFORE React mounts, reducing perceived load time
const userLanguage = localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';

// Start loading immediately (before init even completes)
initialLanguageLoading = loadLanguage(userLanguage).then(() => {
  console.log('⚡ Initial translations preloaded before React mount');
});

// Export function to wait for initial translations
export const waitForInitialTranslations = () => initialLanguageLoading;

export const changeLanguage = async (language: string) => {
  await loadLanguage(language);
  await i18n.changeLanguage(language);
  localStorage.setItem('language', language);
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w20/us.png' },
  { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w20/es.png' },
  { code: 'pt-BR', name: 'Português (BR)', flag: 'https://flagcdn.com/w20/br.png' },
];

export default i18n;