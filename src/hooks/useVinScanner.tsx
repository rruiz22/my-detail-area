/**
 * @deprecated This hook uses the legacy Tesseract.js OCR engine.
 *
 * **MIGRATION NOTICE**: Please migrate to `useVinBarcodeScanner` which uses:
 * - Native Barcode Detection API (Chrome/Edge) - hardware-accelerated
 * - ZXing-JS fallback (universal compatibility)
 *
 * **Performance comparison**:
 * - Tesseract OCR: 3-5 seconds, 60-70% accuracy
 * - Barcode scanner: 0.5-1.5 seconds, 85-95% accuracy
 *
 * **Migration path**:
 * ```typescript
 * // Old (deprecated):
 * import { useVinScanner } from '@/hooks/useVinScanner';
 * const { scanVin } = useVinScanner();
 *
 * // New (recommended):
 * import { useVinBarcodeScanner } from '@/hooks/useVinBarcodeScanner';
 * const { scanVin } = useVinBarcodeScanner();
 * ```
 *
 * **Scheduled for removal**: After 30 days of production testing (target: December 2025)
 *
 * @see useVinBarcodeScanner - Recommended replacement
 * @see ModernVinScanner - Updated component using barcode scanning
 */

import { isValidVin, normalizeVin, VIN_LENGTH } from '@/utils/vinValidation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VinOcrMessage, VinOcrResponse } from '@/workers/vinOcrWorker';

interface VinScanResult {
  vins: string[];
  confidence?: number;
  processingTime?: number;
  bestVin?: string;
  hasValidVin?: boolean;
  method?: 'worker' | 'main-thread';
}

interface VinScanOptions {
  language?: string;
  enableLogging?: boolean;
  timeout?: number;
}

interface UseVinScannerReturn {
  scanVin: (imageFile: Blob | File | string, options?: VinScanOptions) => Promise<string[]>;
  loading: boolean;
  progress: number;
  error: string | null;
  lastScanResult?: VinScanResult;
  cancelScan: () => void;
}

/**
 * VIN Scanner Hook - Uses Web Worker for non-blocking OCR
 *
 * Features:
 * - ✅ Web Worker for non-blocking UI
 * - ✅ Real-time progress tracking
 * - ✅ Scan cancellation support
 * - ✅ Timeout handling (30s default)
 * - ✅ Centralized VIN validation
 *
 * @example
 * const { scanVin, loading, progress } = useVinScanner();
 * const vins = await scanVin(imageBlob, { enableLogging: true });
 */
export function useVinScanner(): UseVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<VinScanResult>();

  const workerRef = useRef<Worker | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const resolveRef = useRef<((value: string[]) => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  /**
   * Initialize Web Worker on first use
   */
  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('@/workers/vinOcrWorker.ts', import.meta.url),
          { type: 'module' }
        );

        // Handle messages from worker
        workerRef.current.onmessage = (event: MessageEvent<VinOcrResponse>) => {
          const { type, payload } = event.data;

          // Only process messages for current task
          if (payload.taskId !== currentTaskIdRef.current) return;

          switch (type) {
            case 'SCAN_PROGRESS':
              setProgress(payload.progress || 0);
              break;

            case 'SCAN_RESULT':
              setLoading(false);
              setProgress(100);
              setError(null);

              const vins = payload.vins || [];
              const bestVin = vins.find(isValidVin) || vins[0];

              setLastScanResult({
                vins,
                confidence: payload.confidence,
                processingTime: payload.processingTime,
                bestVin,
                hasValidVin: vins.some(isValidVin),
                method: 'worker'
              });

              if (resolveRef.current) {
                resolveRef.current(vins);
                resolveRef.current = null;
              }
              break;

            case 'SCAN_ERROR':
              setLoading(false);
              setProgress(0);
              const errorMsg = payload.error || 'Unknown OCR error';
              setError(errorMsg);

              if (rejectRef.current) {
                rejectRef.current(new Error(errorMsg));
                rejectRef.current = null;
              }
              break;
          }
        };

        // Handle worker errors
        workerRef.current.onerror = (error) => {
          console.error('[VIN Scanner] Worker error:', error);
          setError('Worker initialization failed');
          setLoading(false);

          if (rejectRef.current) {
            rejectRef.current(new Error('Worker error: ' + error.message));
            rejectRef.current = null;
          }
        };
      } catch (err) {
        console.error('[VIN Scanner] Failed to initialize worker:', err);
        throw new Error('Failed to initialize VIN scanner worker');
      }
    }
  }, []);

  /**
   * Generate unique task ID
   */
  const generateTaskId = useCallback((): string => {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Convert File/Blob to base64 for worker transmission
   */
  const convertToBase64 = useCallback((file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Main VIN scanning function
   */
  const scanVin = useCallback(async (
    imageFile: Blob | File | string,
    options: VinScanOptions = {}
  ): Promise<string[]> => {
    setError(null);
    setProgress(0);
    setLoading(true);

    const timeout = options.timeout || 30000; // 30 seconds default

    try {
      // Initialize worker if needed
      initializeWorker();

      if (!workerRef.current) {
        throw new Error('Failed to initialize OCR worker');
      }

      // Convert image to base64 if needed
      let imageData: string;
      if (typeof imageFile === 'string') {
        imageData = imageFile;
      } else {
        imageData = await convertToBase64(imageFile);
      }

      // Generate task ID
      const taskId = generateTaskId();
      currentTaskIdRef.current = taskId;

      if (options.enableLogging) {
        console.log(`[VIN Scanner] ⚡ Starting Web Worker scan (task: ${taskId})`);
      }

      // Send scan request to worker
      const message: VinOcrMessage = {
        type: 'SCAN_VIN',
        payload: {
          imageData,
          options: {
            language: options.language || 'eng',
            enableLogging: options.enableLogging || false,
            psm: 8 // Single word mode for VINs
          },
          taskId
        }
      };

      workerRef.current.postMessage(message);

      // Return promise that resolves when worker responds
      return new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        // Timeout handling
        const timeoutId = setTimeout(() => {
          setLoading(false);
          setProgress(0);
          setError(t('vin_scanner_errors.timeout', 'VIN scan took too long. Please try again.'));

          if (rejectRef.current) {
            rejectRef.current(new Error('VIN scan timeout'));
            rejectRef.current = null;
            resolveRef.current = null;
          }
        }, timeout);

        // Clear timeout when resolved/rejected
        const originalResolve = resolveRef.current;
        const originalReject = rejectRef.current;

        resolveRef.current = (value) => {
          clearTimeout(timeoutId);
          if (originalResolve) originalResolve(value);
        };

        rejectRef.current = (reason) => {
          clearTimeout(timeoutId);
          if (originalReject) originalReject(reason);
        };
      }).then((vins: string[]) => {
        // Validate results
        if (vins.length === 0) {
          setError(t('vin_scanner_errors.no_vin_found', 'No VIN detected in the image.'));
        } else if (!vins.some(isValidVin)) {
          setError(t('modern_vin_scanner.status_invalid', 'Scanned text is not a valid VIN. Please rescan.'));
        }

        return vins;
      });

    } catch (err) {
      console.error('[VIN Scanner] Error:', err);
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
  }, [initializeWorker, convertToBase64, generateTaskId, t]);

  /**
   * Cancel current scan
   */
  const cancelScan = useCallback(() => {
    if (workerRef.current && currentTaskIdRef.current) {
      const message: VinOcrMessage = {
        type: 'CANCEL_SCAN',
        payload: { taskId: currentTaskIdRef.current }
      };

      workerRef.current.postMessage(message);
    }

    setLoading(false);
    setProgress(0);
    currentTaskIdRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  /**
   * Cleanup worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    scanVin,
    loading,
    progress,
    error,
    lastScanResult,
    cancelScan
  };
}
