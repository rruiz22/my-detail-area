import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { VinOcrMessage, VinOcrResponse } from '@/workers/vinOcrWorker';

interface VinCacheEntry {
  vins: string[];
  confidence: number;
  timestamp: number;
  processingTime: number;
}

interface OptimizedVinScanResult {
  vins: string[];
  confidence: number;
  processingTime: number;
  source: 'cache' | 'worker' | 'enhanced';
  suggestions?: string[];
}

interface UseOptimizedVinScannerReturn {
  scanVin: (
    imageSource: File | Blob | string,
    options?: {
      language?: string;
      enableLogging?: boolean;
      useCache?: boolean;
      timeout?: number;
    }
  ) => Promise<OptimizedVinScanResult>;
  loading: boolean;
  progress: number;
  error: string | null;
  cancelScan: () => void;
  clearCache: () => void;
  getCacheStats: () => { size: number; hitRate: number };
}

export function useOptimizedVinScanner(): UseOptimizedVinScannerReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, VinCacheEntry>>(new Map());
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });

  // Initialize worker on first use
  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/workers/vinOcrWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<VinOcrResponse>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'SCAN_PROGRESS':
            setProgress(payload.progress || 0);
            break;

          case 'SCAN_RESULT':
            if (payload.taskId === currentTaskIdRef.current) {
              setLoading(false);
              setProgress(100);
              setError(null);

              // Cache the result
              if (payload.vins && payload.vins.length > 0) {
                const cacheKey = generateCacheKey(currentTaskIdRef.current || '');
                cacheRef.current.set(cacheKey, {
                  vins: payload.vins,
                  confidence: payload.confidence || 0,
                  timestamp: Date.now(),
                  processingTime: payload.processingTime || 0
                });
              }
            }
            break;

          case 'SCAN_ERROR':
            if (payload.taskId === currentTaskIdRef.current) {
              setLoading(false);
              setProgress(0);
              setError(payload.error || 'Unknown OCR error');
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('VIN OCR Worker error:', error);
        setError('Worker initialization failed');
        setLoading(false);
      };
    }
  }, []);

  // Generate cache key from image data
  const generateCacheKey = useCallback((imageData: string): string => {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Check cache for existing result
  const checkCache = useCallback((cacheKey: string): VinCacheEntry | null => {
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const TTL = 24 * 60 * 60 * 1000; // 24 hours

      if (age < TTL) {
        cacheStatsRef.current.hits++;
        return cached;
      } else {
        // Remove expired entry
        cacheRef.current.delete(cacheKey);
      }
    }

    cacheStatsRef.current.misses++;
    return null;
  }, []);

  // Main scan function with caching and WebWorker
  const scanVin = useCallback(async (
    imageSource: File | Blob | string,
    options: {
      language?: string;
      enableLogging?: boolean;
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<OptimizedVinScanResult> => {
    setError(null);
    setProgress(0);

    try {
      // Convert image to base64 for caching
      let imageData: string;
      if (typeof imageSource === 'string') {
        imageData = imageSource;
      } else {
        imageData = await convertToBase64(imageSource);
      }

      // Check cache first
      if (options.useCache !== false) {
        const cacheKey = generateCacheKey(imageData);
        const cached = checkCache(cacheKey);

        if (cached) {
          return {
            vins: cached.vins,
            confidence: cached.confidence,
            processingTime: cached.processingTime,
            source: 'cache'
          };
        }
      }

      // Initialize worker if needed
      initializeWorker();

      if (!workerRef.current) {
        throw new Error('Failed to initialize OCR worker');
      }

      setLoading(true);
      const taskId = generateTaskId();
      currentTaskIdRef.current = taskId;

      // Send scan request to worker
      const message: VinOcrMessage = {
        type: 'SCAN_VIN',
        payload: {
          imageData,
          options: {
            language: options.language || 'eng',
            enableLogging: options.enableLogging || false,
            psm: 8 // Single word mode
          },
          taskId
        }
      };

      workerRef.current.postMessage(message);

      // Return promise that resolves when worker responds
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('OCR processing timeout'));
          setLoading(false);
        }, options.timeout || 30000);

        const handleMessage = (event: MessageEvent<VinOcrResponse>) => {
          const { type, payload } = event.data;

          if (payload.taskId !== taskId) return;

          if (type === 'SCAN_RESULT') {
            clearTimeout(timeout);
            workerRef.current?.removeEventListener('message', handleMessage);

            resolve({
              vins: payload.vins || [],
              confidence: payload.confidence || 0,
              processingTime: payload.processingTime || 0,
              source: 'worker'
            });
          } else if (type === 'SCAN_ERROR') {
            clearTimeout(timeout);
            workerRef.current?.removeEventListener('message', handleMessage);
            reject(new Error(payload.error || 'OCR processing failed'));
          }
        };

        workerRef.current?.addEventListener('message', handleMessage);
      });

    } catch (error) {
      setLoading(false);
      setProgress(0);
      throw error;
    }
  }, [initializeWorker, generateCacheKey, checkCache]);

  // Cancel current scan
  const cancelScan = useCallback(() => {
    if (workerRef.current && currentTaskIdRef.current) {
      workerRef.current.postMessage({
        type: 'CANCEL_SCAN',
        payload: { taskId: currentTaskIdRef.current }
      } as VinOcrMessage);
    }
    setLoading(false);
    setProgress(0);
    currentTaskIdRef.current = null;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    cacheStatsRef.current = { hits: 0, misses: 0 };
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const { hits, misses } = cacheStatsRef.current;
    const total = hits + misses;
    return {
      size: cacheRef.current.size,
      hitRate: total > 0 ? hits / total : 0
    };
  }, []);

  // Helper functions
  const convertToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(file);
    });
  };

  const generateTaskId = (): string => {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Cleanup worker on unmount
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
    cancelScan,
    clearCache,
    getCacheStats
  };
}