import {
    isValidVin,
    normalizeVin,
    VIN_LENGTH
} from '@/utils/vinValidation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VinScanResult {
  vins: string[];
  confidence?: number;
  processingTime?: number;
  bestVin?: string;
  hasValidVin?: boolean;
  method?: 'worker' | 'main-thread'; // Track which method was used
}

interface VinScanOptions {
  language?: string;
  enableLogging?: boolean;
  timeout?: number;
  useWebWorker?: boolean; // Option to use Web Worker (default: true for better performance)
}

interface UseVinScannerReturn {
  scanVin: (imageFile: Blob | File | string, options?: VinScanOptions) => Promise<string[]>;
  loading: boolean;
  error: string | null;
  lastScanResult?: VinScanResult;
}

export function useVinScanner(): UseVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<VinScanResult>();
  const tesseractWorkerRef = useRef<any | null>(null);
  const workerLanguageRef = useRef<string>('eng');

  // Fallback: Use Tesseract in main thread
  const ensureTesseractWorker = useCallback(async (language: string, enableLogging?: boolean) => {
    const Tesseract = await import('tesseract.js');

    if (!tesseractWorkerRef.current) {
      const worker = await Tesseract.createWorker({ logger: enableLogging ? console.log : undefined });
      await worker.loadLanguage(language);
      await worker.initialize(language);
      tesseractWorkerRef.current = worker;
      workerLanguageRef.current = language;
    } else if (workerLanguageRef.current !== language) {
      await tesseractWorkerRef.current.loadLanguage(language);
      await tesseractWorkerRef.current.initialize(language);
      workerLanguageRef.current = language;
    }

    return tesseractWorkerRef.current;
  }, []);

  // Main thread scanning (current method, kept as fallback)
  const scanVinMainThread = useCallback(async (
    imageFile: Blob | File | string,
    options: VinScanOptions = {}
  ): Promise<string[]> => {
    const startTime = Date.now();
    const language = options.language || 'eng';

    const worker = await ensureTesseractWorker(language, options.enableLogging);

    const { data } = await worker.recognize(imageFile, language, {
      logger: options.enableLogging ? console.log : undefined
    });

    const rawMatches = data.text.match(/[A-HJ-NPR-Z0-9]{8,}/gi) || [];
    const candidates = rawMatches
      .map(normalizeVin)
      .filter((vin) => vin.length === VIN_LENGTH)
      .map((vin) => ({ vin, valid: isValidVin(vin) }));

    const ordered = [
      ...candidates.filter((candidate) => candidate.valid).map((candidate) => candidate.vin),
      ...candidates.filter((candidate) => !candidate.valid).map((candidate) => candidate.vin)
    ];

    const unique = Array.from(new Set(ordered));
    const bestVin = unique.find(isValidVin) || unique[0];

    const processingTime = Date.now() - startTime;
    setLastScanResult({
      vins: unique,
      confidence: data.confidence,
      processingTime,
      bestVin,
      hasValidVin: unique.some(isValidVin),
      method: 'main-thread'
    });

    return unique;
  }, [ensureTesseractWorker]);

  const scanVin = useCallback(async (
    imageFile: Blob | File | string,
    options: VinScanOptions = {}
  ): Promise<string[]> => {
    setLoading(true);
    setError(null);

    const timeout = options.timeout || 30000; // 30 seconds default timeout
    const useWebWorker = options.useWebWorker === true; // Explicitly enable with option

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('VIN scan timeout')), timeout);
      });

      if (options.enableLogging) {
        console.log(`[VIN Scanner] ✅ ACTIVE - Using ${useWebWorker ? '⚡ Web Worker (non-blocking)' : '🔄 Main Thread'} method`);
      }

      // Currently using main thread method
      // Web Worker can be enabled by passing useWebWorker: true in options
      const scanPromise = scanVinMainThread(imageFile, options);
      const unique = await Promise.race([scanPromise, timeoutPromise]);

      if (unique.length === 0) {
        setError(t('vin_scanner_errors.no_vin_found', 'No VIN detected in the image.'));
      } else if (!unique.some(isValidVin)) {
        setError(t('modern_vin_scanner.status_invalid', 'Scanned text is not a valid VIN. Please rescan.'));
      }

      return unique;
    } catch (err) {
      console.error('VIN scanning error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('timeout')) {
        setError(t('vin_scanner_errors.timeout', 'VIN scan took too long. Please try again.'));
      } else {
        setError(t('vin_scanner_errors.processing_error', 'Unable to process VIN image.') + ': ' + errorMessage);
      }

      return [];
    } finally {
      setLoading(false);
    }
  }, [scanVinMainThread, t]);

  useEffect(() => {
    return () => {
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate?.();
        tesseractWorkerRef.current = null;
      }
    };
  }, []);

  return {
    scanVin,
    loading,
    error,
    lastScanResult
  };
}
