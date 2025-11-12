import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 🔴 CRITICAL FIX: Use STATIC version from package.json instead of dynamic Date.now()
// This allows proper cache validation and automatic invalidation on version bumps
const APP_VERSION = '1.3.12'; // 🔴 CRITICAL FIX: Bumped after Slack notification fixes (short_link, order_number, user_name)
const TRANSLATION_VERSION = APP_VERSION; // Tied to app version for cache invalidation

// ✅ Include app version in cache key - auto-invalidates on version change
const TRANSLATION_CACHE_KEY = `i18n_translations_cache_${APP_VERSION}`;

// Cache expiration time (1 hour)
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Interface for cached translations with metadata
interface CachedTranslations {
  translations: any;
  timestamp: number;
  version: string;
}

// 🔴 CRITICAL FIX: Helper to detect if storage is available (handles private/incognito mode)
function isStorageAvailable(type: 'sessionStorage' | 'localStorage'): boolean {
  try {
    const storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch (e) {
    console.warn(`${type} not available (private mode?):`, e);
    return false;
  }
}

// 🔴 CRITICAL FIX: In-memory cache fallback when storage is not available
const memoryCache = new Map<string, CachedTranslations>();

// Language resources will be loaded dynamically
const resources = {};

// 🔴 CRITICAL FIX: Safely get language from localStorage (may fail in private mode)
const getSavedLanguage = (): string => {
  try {
    return localStorage.getItem('language') || 'en';
  } catch (e) {
    console.warn('localStorage not available, using default language:', e);
    return 'en';
  }
};

i18n
  .use(initReactI18next)
  .init({
    lng: getSavedLanguage(), // default language (safe even in private mode)
    fallbackLng: 'en',
    resources,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

// Track if initial language is being loaded
let initialLanguageLoading: Promise<any> | null = null;

// 🔴 CRITICAL FIX: Retry fetch with exponential backoff
const fetchWithRetry = async (url: string, maxRetries = 2): Promise<Response> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });

      if (!response.ok && i < maxRetries) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (i === maxRetries) throw error;
      const delay = 1000 * (i + 1); // 1s, 2s
      console.warn(`⏳ Retry ${i + 1}/${maxRetries} for ${url} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// ✅ Load translation with storage cache + memory fallback + expiration + version validation
const loadLanguage = async (language: string) => {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;
    const storageAvailable = isStorageAvailable('sessionStorage');

    // Helper to validate cached data
    const validateCache = (cachedData: CachedTranslations): { valid: boolean; reason?: string } => {
      const isExpired = Date.now() - cachedData.timestamp > CACHE_DURATION_MS;
      const isWrongVersion = cachedData.version !== TRANSLATION_VERSION;

      if (isExpired) {
        return { valid: false, reason: `expired (age: ${Math.round((Date.now() - cachedData.timestamp) / 60000)}min)` };
      }
      if (isWrongVersion) {
        return { valid: false, reason: `version mismatch (cached: ${cachedData.version}, current: ${TRANSLATION_VERSION})` };
      }
      return { valid: true };
    };

    // Try sessionStorage first (if available)
    if (storageAvailable) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedData: CachedTranslations = JSON.parse(cached);
          const validation = validateCache(cachedData);

          if (!validation.valid) {
            console.warn(`⏰ sessionStorage cache invalid for ${language}: ${validation.reason}`);
            sessionStorage.removeItem(cacheKey);
          } else {
            // Cache is valid - use it!
            if (!i18n.hasResourceBundle(language, 'translation')) {
              i18n.addResourceBundle(language, 'translation', cachedData.translations);
            }
            console.log(`⚡ Translations loaded from sessionStorage for ${language} (v${cachedData.version})`);
            return cachedData.translations;
          }
        }
      } catch (storageError) {
        console.warn('sessionStorage read failed, trying memory cache:', storageError);
      }
    }

    // Try memory cache if sessionStorage not available or failed
    const memCached = memoryCache.get(cacheKey);
    if (memCached) {
      const validation = validateCache(memCached);

      if (!validation.valid) {
        console.warn(`⏰ Memory cache invalid for ${language}: ${validation.reason}`);
        memoryCache.delete(cacheKey);
      } else {
        // Cache is valid - use it!
        if (!i18n.hasResourceBundle(language, 'translation')) {
          i18n.addResourceBundle(language, 'translation', memCached.translations);
        }
        console.log(`⚡ Translations loaded from memory cache for ${language} (v${memCached.version})`);
        return memCached.translations;
      }
    }

    // Fetch from network with retry
    // Use version parameter to bust cache when translations are updated
    const response = await fetchWithRetry(`/translations/${language}.json?v=${TRANSLATION_VERSION}`);

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

    // 🔴 CRITICAL FIX: Cache with metadata, fallback to memory if storage unavailable
    const cacheData: CachedTranslations = {
      translations,
      timestamp: Date.now(),
      version: TRANSLATION_VERSION
    };

    // Try sessionStorage first
    if (storageAvailable) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 Translations cached in sessionStorage for ${language} (v${TRANSLATION_VERSION})`);
      } catch (storageError) {
        console.warn('sessionStorage write failed, using memory cache:', storageError);
        memoryCache.set(cacheKey, cacheData);
        console.log(`💾 Translations cached in memory for ${language} (v${TRANSLATION_VERSION})`);
      }
    } else {
      // Use memory cache if sessionStorage not available
      memoryCache.set(cacheKey, cacheData);
      console.log(`💾 Translations cached in memory for ${language} (v${TRANSLATION_VERSION}) [storage unavailable]`);
    }

    console.log(`✅ Translations loaded for ${language} (v${TRANSLATION_VERSION})`);
    return translations;
  } catch (error) {
    console.error(`Failed to load language ${language}:`, error);
    return null;
  }
};

// ✅ PHASE 4.1: Preload user's preferred language IMMEDIATELY
// This starts loading BEFORE React mounts, reducing perceived load time
const userLanguage = getSavedLanguage() || navigator.language.split('-')[0] || 'en';

// Start loading immediately (before init even completes)
initialLanguageLoading = loadLanguage(userLanguage).then(() => {
  console.log('⚡ Initial translations preloaded before React mount');
});

// Export function to wait for initial translations
export const waitForInitialTranslations = () => initialLanguageLoading;

export const changeLanguage = async (language: string) => {
  await loadLanguage(language);
  await i18n.changeLanguage(language);

  // 🔴 CRITICAL FIX: Safely save language (may fail in private mode)
  try {
    localStorage.setItem('language', language);
  } catch (e) {
    console.warn('Failed to save language preference (private mode?):', e);
  }
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w20/us.png' },
  { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w20/es.png' },
  { code: 'pt-BR', name: 'Português (BR)', flag: 'https://flagcdn.com/w20/br.png' },
];

export default i18n;