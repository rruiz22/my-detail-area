import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface VinScanResult {
  vins: string[];
  confidence?: number;
  processingTime?: number;
}

interface VinScanOptions {
  language?: string;
  enableLogging?: boolean;
  timeout?: number;
}

interface UseVinScannerReturn {
  scanVin: (imageFile: Blob | File | string, options?: VinScanOptions) => Promise<string[]>;
  loading: boolean;
  error: string | null;
  lastScanResult?: VinScanResult;
}

const VIN_LENGTH = 17;

const transliterationMap: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2,
  T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9
};

const positionWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const normalizeVin = (candidate: string) =>
  candidate
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .replace(/[IOQ]/g, '')
    .slice(0, VIN_LENGTH);

const isValidVin = (vin: string) => {
  if (vin.length !== VIN_LENGTH) return false;

  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    const char = vin[i];
    const value = transliterationMap[char];
    if (value === undefined) {
      return false;
    }
    sum += value * positionWeights[i];
  }

  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 'X' : remainder.toString();
  return vin[8] === checkDigit;
};

export function useVinScanner(): UseVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<VinScanResult>();
  const workerRef = useRef<any | null>(null);
  const workerLanguageRef = useRef<string>('eng');

  const ensureWorker = useCallback(async (language: string, enableLogging?: boolean) => {
    const Tesseract = await import('tesseract.js');

    if (!workerRef.current) {
      const worker = await Tesseract.createWorker({ logger: enableLogging ? console.log : undefined });
      await worker.loadLanguage(language);
      await worker.initialize(language);
      workerRef.current = worker;
      workerLanguageRef.current = language;
    } else if (workerLanguageRef.current !== language) {
      await workerRef.current.loadLanguage(language);
      await workerRef.current.initialize(language);
      workerLanguageRef.current = language;
    }

    return workerRef.current;
  }, []);

  const scanVin = useCallback(async (
    imageFile: Blob | File | string,
    options: VinScanOptions = {}
  ): Promise<string[]> => {
    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const language = options.language || 'eng';
      const worker = await ensureWorker(language, options.enableLogging);

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
        hasValidVin: unique.some(isValidVin)
      });

      if (unique.length === 0) {
        setError(t('vin_scanner_errors.no_vin_found', 'No VIN detected in the image.'));
      } else if (!unique.some(isValidVin)) {
        setError(t('modern_vin_scanner.status_invalid', 'Scanned text is not a valid VIN. Please rescan.'));
      }

      return unique;
    } catch (err) {
      console.error('VIN scanning error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(t('vin_scanner_errors.processing_error', 'Unable to process VIN image.') + ': ' + errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [ensureWorker, t]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate?.();
        workerRef.current = null;
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
