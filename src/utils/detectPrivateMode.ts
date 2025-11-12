/**
 * 🔴 CRITICAL UTILITY: Detect Private/Incognito Mode
 *
 * Mobile browsers (especially Safari iOS and Chrome Android) block storage
 * in private/incognito mode, which causes the app to fail loading translations.
 *
 * This utility detects private mode across different browsers and platforms.
 *
 * Detection methods:
 * - Safari/iOS: localStorage.setItem throws QuotaExceededError
 * - Chrome/Firefox: sessionStorage not writable
 * - General: Storage availability test
 *
 * @returns Promise<boolean> - true if private mode detected
 */

/**
 * Helper to test if a storage type is available
 */
function testStorageAvailability(type: 'sessionStorage' | 'localStorage'): boolean {
  try {
    const storage = window[type];
    const test = '__private_mode_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true; // Storage works
  } catch (e) {
    return false; // Storage blocked (private mode)
  }
}

/**
 * Detect if browser is running in private/incognito mode
 *
 * @returns Promise<boolean> - true if private mode detected, false otherwise
 */
export async function detectPrivateMode(): Promise<boolean> {
  try {
    // Test 1: sessionStorage availability (most reliable)
    const sessionStorageWorks = testStorageAvailability('sessionStorage');
    if (!sessionStorageWorks) {
      console.warn('🔒 Private mode detected: sessionStorage not available');
      return true;
    }

    // Test 2: localStorage availability (Safari iOS specific)
    const localStorageWorks = testStorageAvailability('localStorage');
    if (!localStorageWorks) {
      console.warn('🔒 Private mode detected: localStorage not available');
      return true;
    }

    // Test 3: Safari-specific check using indexedDB
    // Safari returns quota of 0 in private mode
    if ('indexedDB' in window) {
      try {
        const request = indexedDB.open('__private_mode_test__');
        await new Promise((resolve, reject) => {
          request.onsuccess = resolve;
          request.onerror = reject;
        });

        // Clean up
        try {
          indexedDB.deleteDatabase('__private_mode_test__');
        } catch (e) {
          // Ignore cleanup errors
        }
      } catch (e) {
        console.warn('🔒 Private mode detected: indexedDB check failed');
        return true;
      }
    }

    // All tests passed - not in private mode
    console.log('✅ Private mode check: Normal browsing mode');
    return false;
  } catch (error) {
    console.error('Error detecting private mode:', error);
    // Assume normal mode if detection fails
    return false;
  }
}

/**
 * Get a user-friendly message about private mode limitations
 *
 * @param language - Language code ('en', 'es', 'pt-BR')
 * @returns Localized message about private mode
 */
export function getPrivateModeMessage(language: string = 'en'): {
  title: string;
  description: string;
} {
  const messages = {
    en: {
      title: 'Private/Incognito Mode Detected',
      description: 'You\'re browsing in private mode. Some features may be limited. For the best experience, please use regular browsing mode.'
    },
    es: {
      title: 'Modo Privado/Incógnito Detectado',
      description: 'Estás navegando en modo privado. Algunas funciones pueden estar limitadas. Para la mejor experiencia, usa el modo de navegación normal.'
    },
    'pt-BR': {
      title: 'Modo Privado/Anônimo Detectado',
      description: 'Você está navegando em modo privado. Alguns recursos podem ser limitados. Para a melhor experiência, use o modo de navegação normal.'
    }
  };

  return messages[language as keyof typeof messages] || messages.en;
}
