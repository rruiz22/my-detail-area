import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// VIN scan result interface
interface VinScanResult {
  vins: string[];
  confidence?: number;
  processingTime?: number;
}

// Scanner options
interface VinScanOptions {
  language?: string;
  enableLogging?: boolean;
  timeout?: number;
}

// Hook return interface
interface UseVinScannerReturn {
  scanVin: (imageFile: File | string, options?: VinScanOptions) => Promise<string[]>;
  loading: boolean;
  error: string | null;
  lastScanResult?: VinScanResult;
}

export function useVinScanner(): UseVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<VinScanResult>();

  const scanVin = useCallback(async (
    imageFile: File | string,
    options: VinScanOptions = {}
  ): Promise<string[]> => {
    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      // Dynamic import - only load tesseract.js when actually needed
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(options.language || 'eng');

      try {
        const { data: { text, confidence } } = await worker.recognize(
          imageFile,
          options.language || 'eng',
          {
            logger: options.enableLogging ? console.log : () => {} // Conditional logging
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

        const processingTime = Date.now() - startTime;

        // Store scan result
        const scanResult: VinScanResult = {
          vins: uniqueVins,
          confidence,
          processingTime
        };
        setLastScanResult(scanResult);

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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(t('vin_scanner_errors.processing_error') + ': ' + errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [t]);

  return {
    scanVin,
    loading,
    error,
    lastScanResult
  };
}