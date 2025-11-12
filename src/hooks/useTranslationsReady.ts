import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { waitForInitialTranslations } from '@/lib/i18n';

/**
 * Hook to detect when i18next translations are fully loaded and ready
 * Prevents rendering components before translations are available
 *
 * 🔴 CRITICAL FIX: Now returns error state to handle translation load failures gracefully
 *
 * @returns object with {ready: boolean, error: boolean}
 */
export function useTranslationsReady() {
  const { i18n } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check if translations are already loaded
    const checkReady = () => {
      const hasTranslations = i18n.hasResourceBundle(i18n.language, 'translation');

      if (hasTranslations && isMounted) {
        setIsReady(true);
        return true;
      }

      return false;
    };

    // Check immediately
    if (checkReady()) {
      return;
    }

    // Wait for initial translations to load
    const initTranslations = async () => {
      try {
        await waitForInitialTranslations();
        if (isMounted) {
          checkReady();
        }
      } catch (error) {
        console.error('❌ Error waiting for translations:', error);
        if (isMounted) {
          setHasError(true); // Mark as error instead of proceeding
        }
      }
    };

    initTranslations();

    // Also listen for language changes (which happen after loading)
    const handleLanguageChange = () => {
      if (isMounted) {
        checkReady();
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    i18n.on('loaded', handleLanguageChange);

    // 🔴 CRITICAL FIX: Timeout now triggers error instead of proceeding
    // Better to show error message than render with translation keys
    // Increased to 15 seconds for mobile networks (3G/4G) + large translation files (270KB+)
    const timeoutId = setTimeout(() => {
      if (isMounted && !checkReady()) {
        console.error('❌ Translations not loaded after 15 seconds - translation load failure');
        setHasError(true); // Trigger error state instead of proceeding
      }
    }, 15000);

    return () => {
      isMounted = false;
      i18n.off('languageChanged', handleLanguageChange);
      i18n.off('loaded', handleLanguageChange);
      clearTimeout(timeoutId);
    };
  }, [i18n]);

  return { ready: isReady, error: hasError };
}
