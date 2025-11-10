/**
 * ZXing-JS Barcode Scanner Worker
 *
 * Universal fallback barcode scanner using ZXing-JS library.
 * Works in all browsers (Chrome, Firefox, Safari, Edge).
 *
 * This worker runs ZXing barcode detection in a separate thread to avoid blocking the UI.
 */

import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import { isValidVin, normalizeVin } from '../utils/vinValidation';

export interface ScanBarcodeMessage {
  type: 'SCAN_BARCODE';
  imageData: ImageBitmap;
  taskId: string;
  options?: {
    tryHarder?: boolean;
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

// Initialize ZXing reader
let reader: BrowserMultiFormatReader | null = null;

function initReader(tryHarder = true) {
  if (!reader) {
    const hints = new Map();

    // Try harder mode for better accuracy (slower but more reliable)
    if (tryHarder) {
      hints.set(DecodeHintType.TRY_HARDER, true);
    }

    // Possible formats (VIN-relevant)
    // Code 39 is most common for VINs
    // Code 128 is also used
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      'CODE_39',
      'CODE_128',
      'CODE_93',
    ]);

    reader = new BrowserMultiFormatReader(hints);
  }
  return reader;
}

/**
 * Convert ImageBitmap to HTMLImageElement for ZXing
 */
async function imageBitmapToImage(imageBitmap: ImageBitmap): Promise<HTMLImageElement> {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  ctx.drawImage(imageBitmap, 0, 0);

  const blob = await canvas.convertToBlob();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Process barcode scanning request
 */
async function processScanRequest(message: ScanBarcodeMessage): Promise<WorkerResponse> {
  const { imageData, taskId, options } = message;
  const startTime = performance.now();

  try {
    // Initialize reader
    const zxingReader = initReader(options?.tryHarder ?? true);

    // Send progress update
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress: 20,
    } as ProgressMessage);

    // Convert ImageBitmap to Image
    const img = await imageBitmapToImage(imageData);

    // Send progress update
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress: 40,
    } as ProgressMessage);

    // Attempt to decode barcode
    const result = await zxingReader.decodeFromImageElement(img);

    // Send progress update
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress: 80,
    } as ProgressMessage);

    const detectedVins: string[] = [];
    let confidence = 0;

    if (result) {
      const rawText = result.getText();

      // Normalize VIN
      const normalizedVin = normalizeVin(rawText);

      // Validate VIN
      if (isValidVin(normalizedVin)) {
        detectedVins.push(normalizedVin);
        confidence = 0.85; // ZXing is reliable but slightly less than native
      } else if (normalizedVin.length === 17) {
        // Include potentially correctable VINs
        detectedVins.push(normalizedVin);
        confidence = 0.6;
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      type: 'SCAN_RESULT',
      taskId,
      vins: detectedVins,
      confidence,
      processingTime,
    };
  } catch (error) {
    // ZXing throws NotFoundException if no barcode found
    // This is not an error, just no barcode detected
    if (error && error.constructor.name === 'NotFoundException') {
      const processingTime = performance.now() - startTime;
      return {
        type: 'SCAN_RESULT',
        taskId,
        vins: [],
        confidence: 0,
        processingTime,
      };
    }

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

// Cleanup on worker termination
self.addEventListener('unload', () => {
  if (reader) {
    reader.reset();
    reader = null;
  }
});

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse };
