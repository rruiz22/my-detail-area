/**
 * Barcode Engine Abstraction Layer
 *
 * Provides a unified interface for barcode scanning that automatically selects
 * the best available engine:
 * - Native Barcode Detection API (Chrome/Edge) - hardware-accelerated
 * - ZXing-JS (Universal fallback) - software-based
 *
 * This abstraction allows seamless switching between engines without changing
 * the consuming code.
 */

import { detectBarcodeSupport, type BarcodeEngineType } from '@/utils/barcodeSupport';
import type {
  ScanResultMessage,
  ScanErrorMessage,
  ProgressMessage,
} from '@/workers/barcodeDetectionWorker';

export interface ScanOptions {
  tryHarder?: boolean;
  formats?: string[];
  timeout?: number;
}

export interface ScanResult {
  vins: string[];
  confidence: number;
  engine: BarcodeEngineType;
  processingTime: number;
}

export interface ScanProgress {
  progress: number;
  message?: string;
}

export type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Barcode Engine - Unified barcode scanning interface
 */
export class BarcodeEngine {
  private worker: Worker | null = null;
  private engineType: BarcodeEngineType;
  private activeTaskId: string | null = null;

  constructor() {
    this.engineType = detectBarcodeSupport();
    this.initWorker();
  }

  /**
   * Initialize the appropriate Web Worker based on engine type
   */
  private initWorker(): void {
    try {
      if (this.engineType === 'native') {
        // Native Barcode Detection API Worker
        this.worker = new Worker(
          new URL('../workers/barcodeDetectionWorker.ts', import.meta.url),
          { type: 'module' }
        );
      } else {
        // ZXing-JS Fallback Worker
        this.worker = new Worker(
          new URL('../workers/zxingBarcodeWorker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      console.log(`🔍 Barcode Engine initialized: ${this.engineType.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to initialize barcode worker:', error);
      throw error;
    }
  }

  /**
   * Get the current engine type
   */
  getEngineType(): BarcodeEngineType {
    return this.engineType;
  }

  /**
   * Scan a barcode from image data
   *
   * @param imageData - Image data to scan (File, Blob, or ImageBitmap)
   * @param options - Scanning options
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to scan result
   */
  async scan(
    imageData: File | Blob | ImageBitmap,
    options: ScanOptions = {},
    onProgress?: ProgressCallback
  ): Promise<ScanResult> {
    if (!this.worker) {
      throw new Error('Barcode worker not initialized');
    }

    // Generate unique task ID
    const taskId = Math.random().toString(36).substring(2, 15);
    this.activeTaskId = taskId;

    // Default timeout: 30 seconds
    const timeout = options.timeout || 30000;

    // Convert File/Blob to ImageBitmap if necessary
    let imageBitmap: ImageBitmap;

    if (imageData instanceof ImageBitmap) {
      imageBitmap = imageData;
    } else {
      // Convert File/Blob to ImageBitmap
      imageBitmap = await createImageBitmap(imageData);
    }

    return new Promise((resolve, reject) => {
      // Timeout handler
      const timeoutId = setTimeout(() => {
        this.activeTaskId = null;
        reject(new Error(`Barcode scan timeout after ${timeout}ms`));
      }, timeout);

      // Message handler
      const messageHandler = (event: MessageEvent) => {
        const message = event.data as ScanResultMessage | ScanErrorMessage | ProgressMessage;

        // Only process messages for this task
        if (message.taskId !== taskId) {
          return;
        }

        if (message.type === 'PROGRESS') {
          // Progress update
          if (onProgress) {
            onProgress({
              progress: message.progress,
              message: `Scanning... ${message.progress}%`,
            });
          }
        } else if (message.type === 'SCAN_RESULT') {
          // Success
          clearTimeout(timeoutId);
          this.activeTaskId = null;
          this.worker?.removeEventListener('message', messageHandler);

          resolve({
            vins: message.vins,
            confidence: message.confidence,
            engine: this.engineType,
            processingTime: message.processingTime,
          });
        } else if (message.type === 'SCAN_ERROR') {
          // Error
          clearTimeout(timeoutId);
          this.activeTaskId = null;
          this.worker?.removeEventListener('message', messageHandler);

          reject(new Error(message.error));
        }
      };

      this.worker?.addEventListener('message', messageHandler);

      // Send scan request to worker
      this.worker?.postMessage({
        type: 'SCAN_BARCODE',
        imageData: imageBitmap,
        taskId,
        options: {
          tryHarder: options.tryHarder ?? true,
          formats: options.formats || ['code_39', 'code_128'],
        },
      });
    });
  }

  /**
   * Cancel active scan
   */
  cancel(): void {
    if (this.activeTaskId) {
      this.activeTaskId = null;
      // Terminate and reinitialize worker
      this.destroy();
      this.initWorker();
    }
  }

  /**
   * Destroy the worker
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeTaskId = null;
  }

  /**
   * Check if a scan is currently in progress
   */
  isScanning(): boolean {
    return this.activeTaskId !== null;
  }
}

/**
 * Singleton instance for convenience
 */
let globalEngine: BarcodeEngine | null = null;

/**
 * Get or create a global barcode engine instance
 */
export function getGlobalBarcodeEngine(): BarcodeEngine {
  if (!globalEngine) {
    globalEngine = new BarcodeEngine();
  }
  return globalEngine;
}

/**
 * Destroy the global barcode engine instance
 */
export function destroyGlobalBarcodeEngine(): void {
  if (globalEngine) {
    globalEngine.destroy();
    globalEngine = null;
  }
}
