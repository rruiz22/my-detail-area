import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// 🔴 CRITICAL FIX: Use STATIC version from package.json instead of dynamic Date.now()
// This allows proper cache validation and automatic invalidation on version bumps
const APP_VERSION = '1.3.92'; // 🚀 v1.3.89: Fix punch validation parameter
const TRANSLATION_VERSION = APP_VERSION; // Tied to app version for cache invalidation

// 🎛️ FEATURE FLAG: Enable code splitting (set to false for rollback)
// Set via environment variable: VITE_USE_CODE_SPLITTING
const USE_CODE_SPLITTING = import.meta.env.VITE_USE_CODE_SPLITTING !== 'false';

// ✅ Include app version in cache key - auto-invalidates on version change
const TRANSLATION_CACHE_KEY = `i18n_translations_cache_${APP_VERSION}${USE_CODE_SPLITTING ? '_split' : ''}`;

// ✅ PERFORMANCE FIX: Cache expiration time (5 minutes)
// Reduced from 1 hour to match browser cache (max-age=300) for consistency
// Ensures translation updates are visible within 5 minutes of deploy
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes (down from 1 hour)

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

// 📦 CODE SPLITTING: All available namespaces
// HYBRID APPROACH: Preload all namespaces for zero-config component compatibility
// Still benefits from code splitting: parallel requests, granular caching, HTTP/2 multiplexing
// Total: ~250KB across 80 small files vs 500KB monolithic (6x faster with parallelism)
const DEFAULT_NAMESPACE = 'common';
const ALL_NAMESPACES = [
  'accessibility', 'admin', 'announcements', 'attachments', 'auth',
  'batch_vin', 'breadcrumbs', 'cache', 'calendar', 'car_wash',
  'car_wash_orders', 'chat', 'cloud_sync', 'common', 'completion_date',
  'contacts', 'dashboard', 'data_table', 'dealer', 'dealerships',
  'detail_hub', 'due_date', 'error_screens', 'followers', 'forms',
  'get_ready', 'groups', 'integrations', 'invitations', 'layout',
  'legal', 'management', 'messages', 'modern_vin_scanner', 'navigation',
  'nfc', 'nfc_tracking', 'notifications', 'order_comments', 'order_detail',
  'orders', 'pages', 'password_management', 'permissions', 'presence',
  'productivity', 'profile', 'quick_actions', 'quick_scan', 'recent_activity',
  'recon', 'recon_defaults', 'recon_orders', 'remote_kiosk', 'remote_kiosk_generator', 'remote_kiosk_management', 'reports', 'roles',
  'sales', 'sales_orders', 'schedule_view', 'search', 'service_orders',
  'services', 'settings', 'sticker_scanner', 'stock', 'sweetalert',
  'system_update', 'time', 'ui', 'user_management', 'users',
  'validation', 'vehicle_info', 'vin_analyzer', 'vin_input', 'vin_integration',
  'vin_scanner', 'vin_scanner_errors', 'vin_scanner_history', 'vin_scanner_hub',
  'vin_scanner_settings'
];

// 🔴 ROLLBACK: Preload ALL namespaces (82 total)
// Fix 5 (10 critical NS) was too aggressive - caused missing translations (Detail Hub showed keys)
// BMW of Sudbury heavily uses Detail Hub module which wasn't in critical list
// Reverted to preload all namespaces for zero-config compatibility
// With Fixes 1-4 (timeout 60s, SW cleanup, browser cache 5min), 82 NS load is acceptable
const PRELOAD_NAMESPACES = ALL_NAMESPACES; // Load all 82 on init

// Track if initial language is being loaded
let initialLanguageLoading: Promise<any> | null = null;

// 🔴 CRITICAL FIX: Retry fetch with exponential backoff
// ✅ PERFORMANCE FIX: Enable browser cache (5 minutes) to reduce network requests
const fetchWithRetry = async (url: string, maxRetries = 2): Promise<Response> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, {
        cache: 'default', // Use browser cache (respects Cache-Control headers)
        headers: {
          'Cache-Control': 'public, max-age=300' // 5 minutes browser cache
        }
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

// ============================================================
// LEGACY SYSTEM (Monolithic translations)
// ============================================================

// ✅ Load translation with storage cache + memory fallback + expiration + version validation
const loadLanguageMonolithic = async (language: string) => {
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
            console.log(`⚡ [MONOLITHIC] Translations loaded from sessionStorage for ${language} (v${cachedData.version})`);
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
        console.log(`⚡ [MONOLITHIC] Translations loaded from memory cache for ${language} (v${memCached.version})`);
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
        console.log(`💾 [MONOLITHIC] Translations cached in sessionStorage for ${language} (v${TRANSLATION_VERSION})`);
      } catch (storageError) {
        console.warn('sessionStorage write failed, using memory cache:', storageError);
        memoryCache.set(cacheKey, cacheData);
        console.log(`💾 [MONOLITHIC] Translations cached in memory for ${language} (v${TRANSLATION_VERSION})`);
      }
    } else {
      // Use memory cache if sessionStorage not available
      memoryCache.set(cacheKey, cacheData);
      console.log(`💾 [MONOLITHIC] Translations cached in memory for ${language} (v${TRANSLATION_VERSION}) [storage unavailable]`);
    }

    console.log(`✅ [MONOLITHIC] Translations loaded for ${language} (v${TRANSLATION_VERSION})`);
    return translations;
  } catch (error) {
    console.error(`❌ Failed to load language ${language}:`, error);

    // 🔴 CRITICAL FIX: Auto-fallback to English if preferred language fails
    if (language !== 'en') {
      console.warn(`⚠️ Attempting fallback to English...`);
      try {
        const fallbackResponse = await fetchWithRetry(`/translations/en.json?v=${TRANSLATION_VERSION}`);

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
        }

        const fallbackText = await fallbackResponse.text();

        if (!fallbackText.trim()) {
          throw new Error('Empty fallback response received');
        }

        let fallbackTranslations;
        try {
          fallbackTranslations = JSON.parse(fallbackText);
        } catch (parseError) {
          console.error(`JSON parse error in fallback en.json:`, parseError);
          throw new Error(`Invalid JSON in fallback en.json: ${parseError.message}`);
        }

        // Add English as fallback resource
        if (!i18n.hasResourceBundle('en', 'translation')) {
          i18n.addResourceBundle('en', 'translation', fallbackTranslations);
        }

        // Cache the English fallback
        const fallbackCacheKey = `${TRANSLATION_CACHE_KEY}_en`;
        const fallbackCacheData: CachedTranslations = {
          translations: fallbackTranslations,
          timestamp: Date.now(),
          version: TRANSLATION_VERSION
        };

        const storageAvailable = isStorageAvailable('sessionStorage');
        if (storageAvailable) {
          try {
            sessionStorage.setItem(fallbackCacheKey, JSON.stringify(fallbackCacheData));
            console.log(`💾 English fallback cached in sessionStorage`);
          } catch (storageError) {
            memoryCache.set(fallbackCacheKey, fallbackCacheData);
            console.log(`💾 English fallback cached in memory`);
          }
        } else {
          memoryCache.set(fallbackCacheKey, fallbackCacheData);
          console.log(`💾 English fallback cached in memory [storage unavailable]`);
        }

        // Switch to English
        await i18n.changeLanguage('en');
        console.log(`✅ Successfully fell back to English translations`);

        return fallbackTranslations;
      } catch (fallbackError) {
        console.error(`❌ English fallback also failed:`, fallbackError);
      }
    }

    return null;
  }
};

// ============================================================
// INITIALIZATION: Choose strategy based on feature flag
// ============================================================

if (USE_CODE_SPLITTING) {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('🚀 Code splitting ENABLED - using namespace-based translations');
  }

  // Initialize with Backend for namespace-based loading
  i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      lng: getSavedLanguage(),
      fallbackLng: 'en',
      ns: PRELOAD_NAMESPACES, // Preload these namespaces
      defaultNS: DEFAULT_NAMESPACE,
      fallbackNS: DEFAULT_NAMESPACE,

      backend: {
        loadPath: '/translations/{{lng}}/{{ns}}.json?v=' + TRANSLATION_VERSION,
        requestOptions: {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }
      },

      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },

      // 🔴 CRITICAL FIX: Enable namespace separation via dot notation
      // This allows t('navigation.dashboard') to look in 'navigation' namespace for 'dashboard' key
      // Without this, t('navigation.dashboard') looks for nested key in 'common' namespace
      nsSeparator: '.',
      keySeparator: false, // Disable nested key separator to allow dots in keys

      // Load namespaces asynchronously
      partialBundledLanguages: true,

      // React-specific
      react: {
        useSuspense: false // Disable suspense to use our custom loading boundary
      }
    });

  // Only log namespace list in development
  if (import.meta.env.DEV) {
    console.log(`⚡ Preloading ${PRELOAD_NAMESPACES.length} namespaces`);
  }

} else {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('📦 Code splitting DISABLED - using monolithic translations');
  }

  // Initialize without Backend (legacy system)
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

  // ✅ PHASE 4.1: Preload user's preferred language IMMEDIATELY
  // This starts loading BEFORE React mounts, reducing perceived load time
  const userLanguage = getSavedLanguage() || (navigator.language || '').split('-')[0] || 'en';

  // Start loading immediately (before init even completes)
  initialLanguageLoading = loadLanguageMonolithic(userLanguage).then(() => {
    console.log('⚡ [MONOLITHIC] Initial translations preloaded before React mount');
  });
}

// Export function to wait for initial translations
export const waitForInitialTranslations = async () => {
  if (USE_CODE_SPLITTING) {
    // 🎯 Minimum splash screen time: 2 seconds
    // This prevents translation key flash by ensuring translations load before UI renders
    const minimumSplashTime = 2000; // 2 seconds
    const startTime = Date.now();

    // With Backend, i18next handles loading automatically
    await i18n.loadNamespaces(PRELOAD_NAMESPACES);

    // 🔴 CRITICAL FIX: Wait for resources to be actually added
    // The 'loaded' event fires BEFORE resources are added to i18next store
    // We need to poll until the resources are actually available
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    const currentLang = i18n.language;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if critical namespaces have translations loaded
      // These are the most frequently used namespaces across the app
      const hasCommon = i18n.hasResourceBundle(currentLang, 'common');
      const hasNavigation = i18n.hasResourceBundle(currentLang, 'navigation');
      const hasLayout = i18n.hasResourceBundle(currentLang, 'layout');
      const hasReports = i18n.hasResourceBundle(currentLang, 'reports');
      const hasDashboard = i18n.hasResourceBundle(currentLang, 'dashboard');

      if (hasCommon && hasNavigation && hasLayout && hasReports && hasDashboard) {
        // Only log in development
        if (import.meta.env.DEV) {
          console.log(`✅ [CODE SPLITTING] Critical namespaces (5) confirmed available after ${attempt * 100}ms`);
        }

        // Ensure minimum splash time has elapsed
        const elapsedTime = Date.now() - startTime;
        const remainingTime = minimumSplashTime - elapsedTime;

        if (remainingTime > 0) {
          if (import.meta.env.DEV) {
            console.log(`⏱️ [SPLASH] Waiting additional ${remainingTime}ms to reach minimum 2s splash time`);
          }
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        return;
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.error('⚠️ [CODE SPLITTING] Critical namespaces not available after 5 seconds');
  } else {
    // Legacy system
    return initialLanguageLoading;
  }
};

export const changeLanguage = async (language: string) => {
  if (!USE_CODE_SPLITTING) {
    // Legacy system - manual loading
    await loadLanguageMonolithic(language);
  }

  // Both systems use i18n.changeLanguage
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

// Export feature flag status for debugging
export const isCodeSplittingEnabled = () => USE_CODE_SPLITTING;

export default i18n;
