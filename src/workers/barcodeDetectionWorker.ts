/**
 * Native Barcode Detection API Worker
 *
 * Uses browser's native BarcodeDetector API for hardware-accelerated scanning.
 * Supported in Chrome and Edge (Chromium-based browsers).
 *
 * This worker runs barcode detection in a separate thread to avoid blocking the UI.
 */

import { isValidVin, normalizeVin } from '../utils/vinValidation';

export interface ScanBarcodeMessage {
  type: 'SCAN_BARCODE';
  imageData: ImageBitmap;
  taskId: string;
  options?: {
    formats?: string[];
  };
}

export interface ScanResultMessage {
  type: 'SCAN_RESULT';
  taskId: string;
  vins: string[];
  confidence: number;
  processingTime: number;
}

export interface ScanErrorMessage {
  type: 'SCAN_ERROR';
  taskId: string;
  error: string;
}

export interface ProgressMessage {
  type: 'PROGRESS';
  taskId: string;
  progress: number;
}

type WorkerMessage = ScanBarcodeMessage;
type WorkerResponse = ScanResultMessage | ScanErrorMessage | ProgressMessage;

// Initialize Barcode Detector with VIN-relevant formats
let detector: any = null;

async function initDetector(formats?: string[]) {
  if (!detector) {
    const supportedFormats = formats || ['code_39', 'code_128'];

    try {
      // @ts-ignore - BarcodeDetector is experimental
      detector = new BarcodeDetector({
        formats: supportedFormats,
      });
    } catch (error) {
      throw new Error(`Failed to initialize BarcodeDetector: ${error}`);
    }
  }
  return detector;
}

/**
 * Process barcode scanning request
 */
async function processScanRequest(message: ScanBarcodeMessage): Promise<WorkerResponse> {
  const { imageData, taskId, options } = message;
  const startTime = performance.now();

  try {
    // Initialize detector
    const barcodeDetector = await initDetector(options?.formats);

    // Send progress update
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress: 30,
    } as ProgressMessage);

    // Detect barcodes
    const barcodes = await barcodeDetector.detect(imageData);

    // Send progress update
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress: 70,
    } as ProgressMessage);

    // Extract and validate VINs
    const detectedVins: string[] = [];
    const vinConfidences: number[] = [];

    for (const barcode of barcodes) {
      const rawValue = barcode.rawValue;

      // Normalize VIN (remove spaces, convert to uppercase)
      const normalizedVin = normalizeVin(rawValue);

      // Validate VIN
      if (isValidVin(normalizedVin)) {
        detectedVins.push(normalizedVin);
        // Barcode confidence is typically high for native API
        vinConfidences.push(0.95);
      } else if (normalizedVin.length === 17) {
        // Include potentially correctable VINs
        detectedVins.push(normalizedVin);
        vinConfidences.push(0.6);
      }
    }

    // Calculate average confidence
    const avgConfidence =
      vinConfidences.length > 0
        ? vinConfidences.reduce((sum, conf) => sum + conf, 0) / vinConfidences.length
        : 0;

    const processingTime = performance.now() - startTime;

    return {
      type: 'SCAN_RESULT',
      taskId,
      vins: detectedVins,
      confidence: avgConfidence,
      processingTime,
    };
  } catch (error) {
    return {
      type: 'SCAN_ERROR',
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error during barcode scanning',
    };
  }
}

/**
 * Main message handler
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'SCAN_BARCODE') {
    const response = await processScanRequest(message);
    self.postMessage(response);
  }
});

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse };
