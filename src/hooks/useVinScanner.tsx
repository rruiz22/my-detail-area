import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface UseVinScannerReturn {
  scanVin: (imageFile: File | string) => Promise<string[]>;
  loading: boolean;
  error: string | null;
}

export function useVinScanner(): UseVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanVin = useCallback(async (imageFile: File | string): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      // Dynamic import - only load tesseract.js when actually needed
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng');

      try {
        const { data: { text } } = await worker.recognize(
          imageFile,
          'eng',
          {
            logger: () => {} // Disable logging
          }
        );

        // VIN regex pattern - 17 characters, excluding I, O, Q
        const vinPattern = /[A-HJ-NPR-Z0-9]{17}/g;
        const matches = text.match(vinPattern) || [];

        // Filter out duplicates and validate
        const uniqueVins = [...new Set(matches)].filter(vin =>
          vin.length === 17 &&
          !/[IOQ]/.test(vin) // Ensure no invalid characters
        );

        if (uniqueVins.length === 0) {
          setError(t('vin_scanner_errors.no_vin_found'));
        } else {
          console.log('VINs detectados:', uniqueVins);
        }

        return uniqueVins;
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      console.error('VIN scanning error:', err);
      setError(t('vin_scanner_errors.processing_error'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [t]);

  return {
    scanVin,
    loading,
    error
  };
}