/**
 * VIN Barcode Scanner Hook
 *
 * React hook for barcode-based VIN scanning using ZXing-JS and native Barcode Detection API.
 * Automatically selects the best available engine and provides a unified interface.
 *
 * Features:
 * - Progressive enhancement (native API → ZXing fallback)
 * - Web Worker for non-blocking processing
 * - Auto-correction for OCR errors
 * - Progress tracking
 * - Timeout handling
 * - Cancellation support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BarcodeEngine, type ScanOptions } from '@/services/barcodeEngine';
import { VinAutoCorrection } from '@/utils/vinAutoCorrection';
import { validateVinDetailed } from '@/utils/vinValidation';
import type { BarcodeEngineType } from '@/utils/barcodeSupport';

export interface VinScanResult {
  vin: string;
  confidence: number;
  corrected: boolean;
  engine: BarcodeEngineType;
  processingTime: number;
}

export interface UseVinBarcodeScannerReturn {
  scanVin: (imageFile: File | Blob, options?: ScanOptions) => Promise<string[]>;
  loading: boolean;
  progress: number;
  error: string | null;
  lastScanResult?: VinScanResult;
  engineType: BarcodeEngineType;
  cancelScan: () => void;
}

/**
 * Hook for VIN barcode scanning
 *
 * @example
 * ```tsx
 * const { scanVin, loading, progress, error } = useVinBarcodeScanner();
 *
 * const handleFileUpload = async (file: File) => {
 *   try {
 *     const vins = await scanVin(file);
 *     console.log('Detected VINs:', vins);
 *   } catch (err) {
 *     console.error('Scan failed:', err);
 *   }
 * };
 * ```
 */
export function useVinBarcodeScanner(): UseVinBarcodeScannerReturn {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<VinScanResult | undefined>(undefined);

  const engineRef = useRef<BarcodeEngine | null>(null);
  const autoCorrectorRef = useRef<VinAutoCorrection | null>(null);

  // Initialize engine and auto-corrector on mount
  useEffect(() => {
    engineRef.current = new BarcodeEngine();
    autoCorrectorRef.current = VinAutoCorrection.getInstance();

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  /**
   * Scan VIN from image file
   */
  const scanVin = useCallback(
    async (imageFile: File | Blob, options: ScanOptions = {}): Promise<string[]> => {
      if (!engineRef.current) {
        throw new Error('Barcode engine not initialized');
      }

      setLoading(true);
      setProgress(0);
      setError(null);

      try {
        // Initial progress
        setProgress(10);

        // Scan barcode with engine
        const result = await engineRef.current.scan(
          imageFile,
          options,
          (progressUpdate) => {
            setProgress(10 + progressUpdate.progress * 0.7); // 10-80%
          }
        );

        setProgress(85);

        // No VINs detected
        if (result.vins.length === 0) {
          setProgress(100);
          setLoading(false);
          throw new Error('No VIN barcode detected. Please ensure the barcode is visible and well-lit.');
        }

        // Process and validate detected VINs
        const processedVins: string[] = [];
        const autoCorrector = autoCorrectorRef.current!;

        for (const rawVin of result.vins) {
          // Try auto-correction if VIN is invalid
          const validation = validateVinDetailed(rawVin);

          if (validation.valid) {
            // VIN is valid as-is
            processedVins.push(rawVin);
          } else {
            // Attempt auto-correction
            const corrected = autoCorrector.correctVin(rawVin);
            const correctedValidation = validateVinDetailed(corrected);

            if (correctedValidation.valid) {
              processedVins.push(corrected);

              // Teach the corrector for future use
              if (corrected !== rawVin) {
                autoCorrector.teachCorrection(rawVin, corrected);
              }
            } else {
              // Include uncorrectable VINs for manual review
              processedVins.push(rawVin);
            }
          }
        }

        setProgress(100);
        setLoading(false);

        // Store last scan result
        if (processedVins.length > 0) {
          setLastScanResult({
            vin: processedVins[0],
            confidence: result.confidence,
            corrected: processedVins[0] !== result.vins[0],
            engine: result.engine,
            processingTime: result.processingTime,
          });
        }

        return processedVins;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error during VIN scanning';
        setError(errorMessage);
        setProgress(0);
        setLoading(false);
        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * Cancel active scan
   */
  const cancelScan = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.cancel();
      setLoading(false);
      setProgress(0);
      setError(null);
    }
  }, []);

  return {
    scanVin,
    loading,
    progress,
    error,
    lastScanResult,
    engineType: engineRef.current?.getEngineType() || 'zxing',
    cancelScan,
  };
}
