import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { waitForInitialTranslations } from '@/lib/i18n';

/**
 * Hook to detect when i18next translations are fully loaded and ready
 * Prevents rendering components before translations are available
 *
 * @returns boolean indicating if translations are ready
 */
export function useTranslationsReady() {
  const { i18n } = useTranslation();
  const [isReady, setIsReady] = useState(false);

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
        console.error('Error waiting for translations:', error);
        if (isMounted) {
          setIsReady(true); // Proceed anyway to prevent infinite loading
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

    // Fallback timeout (max 5 seconds)
    const timeoutId = setTimeout(() => {
      if (isMounted && !checkReady()) {
        console.warn('Translations not loaded after 5 seconds, proceeding anyway');
        setIsReady(true); // Proceed anyway to prevent infinite loading
      }
    }, 5000);

    return () => {
      isMounted = false;
      i18n.off('languageChanged', handleLanguageChange);
      i18n.off('loaded', handleLanguageChange);
      clearTimeout(timeoutId);
    };
  }, [i18n]);

  return isReady;
}
