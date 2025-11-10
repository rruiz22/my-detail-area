/**
 * @deprecated Legacy Tesseract.js OCR Worker - Scheduled for removal
 *
 * **MIGRATION NOTICE**: This worker has been replaced by:
 * - `barcodeDetectionWorker.ts` - Native Barcode Detection API
 * - `zxingBarcodeWorker.ts` - ZXing-JS fallback
 *
 * **Why deprecated**:
 * - Slow performance (3-5 seconds vs 0.5-1.5 seconds)
 * - Lower accuracy (60-70% vs 85-95%)
 * - Large bundle size (~2MB Tesseract.js vs ~200KB ZXing-JS)
 * - OCR not optimal for barcodes (designed for text recognition)
 *
 * **Replacement**: Use `BarcodeEngine` service with progressive enhancement
 *
 * **Scheduled for removal**: December 2025 (after 30-day production validation)
 *
 * @see barcodeDetectionWorker.ts
 * @see zxingBarcodeWorker.ts
 * @see BarcodeEngine
 */

import { createWorker } from 'tesseract.js';

export interface VinOcrMessage {
  type: 'SCAN_VIN' | 'CANCEL_SCAN';
  payload: {
    imageData?: string | File | Blob;
    options?: {
      language?: string;
      enableLogging?: boolean;
      psm?: number;
    };
    taskId?: string;
  };
}

export interface VinOcrResponse {
  type: 'SCAN_RESULT' | 'SCAN_ERROR' | 'SCAN_PROGRESS';
  payload: {
    taskId?: string;
    vins?: string[];
    confidence?: number;
    processingTime?: number;
    error?: string;
    progress?: number;
  };
}

// Import validation utilities - Note: In worker context, we need to inline these
// since imports may not work correctly in web workers
const VIN_LENGTH = 17;

const transliterationMap: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2,
  T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9
};

const positionWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// VIN pattern regex for better accuracy
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;

// Inline validation functions for worker context
function isValidVin(vin: string): boolean {
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
}

function normalizeVin(raw: string): string {
  return raw
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .replace(/[IOQ]/g, '')
    .slice(0, VIN_LENGTH);
}

// Enhanced VIN validation with confidence
function validateVin(vin: string): { isValid: boolean; confidence: number } {
  if (!vin || vin.length !== VIN_LENGTH) {
    return { isValid: false, confidence: 0 };
  }

  // Remove invalid characters (I, O, Q not allowed in VINs)
  if (/[IOQ]/.test(vin)) {
    return { isValid: false, confidence: 0.1 };
  }

  // Check digit validation
  const valid = isValidVin(vin);
  return {
    isValid: valid,
    confidence: valid ? 0.95 : 0.3
  };
}

// Auto-correction suggestions
function suggestCorrections(detectedText: string): string[] {
  const suggestions: string[] = [];

  // Common OCR errors
  const corrections: { [key: string]: string } = {
    '0': 'O', 'O': '0', 'Q': '0',
    '1': 'I', 'I': '1', 'l': '1',
    '5': 'S', 'S': '5',
    '8': 'B', 'B': '8',
    '6': 'G', 'G': '6'
  };

  // Try different correction combinations
  const baseText = detectedText.toUpperCase();
  for (const [wrong, right] of Object.entries(corrections)) {
    const candidate = baseText.replace(new RegExp(wrong, 'g'), right);
    const normalized = normalizeVin(candidate);
    if (normalized !== baseText && validateVin(normalized).isValid) {
      suggestions.push(normalized);
    }
  }

  return suggestions;
}

// Main worker logic
self.onmessage = async (event: MessageEvent<VinOcrMessage>) => {
  const { type, payload } = event.data;

  if (type === 'SCAN_VIN') {
    const { imageData, options = {}, taskId } = payload;

    if (!imageData) {
      self.postMessage({
        type: 'SCAN_ERROR',
        payload: { error: 'No image data provided', taskId }
      } as VinOcrResponse);
      return;
    }

    try {
      const startTime = Date.now();

      // Progress update
      self.postMessage({
        type: 'SCAN_PROGRESS',
        payload: { progress: 10, taskId }
      } as VinOcrResponse);

      // Initialize Tesseract worker with optimized config
      const worker = await createWorker({
        logger: options.enableLogging ? (m) => {
          if (m.status === 'recognizing text') {
            self.postMessage({
              type: 'SCAN_PROGRESS',
              payload: { progress: 10 + (m.progress * 80), taskId }
            } as VinOcrResponse);
          }
        } : undefined,
        cachePath: '/tesseract-cache'
      });

      await worker.loadLanguage(options.language || 'eng');
      await worker.initialize(options.language || 'eng');

      // Optimized OCR parameters for VINs
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: options.psm || 8, // Single word
        tessedit_ocr_engine_mode: 1, // Neural nets LSTM only
      });

      // Progress update
      self.postMessage({
        type: 'SCAN_PROGRESS',
        payload: { progress: 90, taskId }
      } as VinOcrResponse);

      // Perform OCR recognition
      const { data: { text, confidence } } = await worker.recognize(imageData);

      // Extract potential VINs
      const potentialVins = text.match(VIN_PATTERN) || [];
      const validVins: string[] = [];
      let highestConfidence = 0;

      // Validate each potential VIN
      for (const vin of potentialVins) {
        const validation = validateVin(vin);
        if (validation.isValid) {
          validVins.push(vin);
          highestConfidence = Math.max(highestConfidence, validation.confidence);
        } else {
          // Try auto-corrections
          const suggestions = suggestCorrections(vin);
          validVins.push(...suggestions);
        }
      }

      await worker.terminate();

      const processingTime = Date.now() - startTime;

      // Send success result
      self.postMessage({
        type: 'SCAN_RESULT',
        payload: {
          vins: validVins,
          confidence: highestConfidence,
          processingTime,
          taskId
        }
      } as VinOcrResponse);

    } catch (error) {
      self.postMessage({
        type: 'SCAN_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'OCR processing failed',
          taskId
        }
      } as VinOcrResponse);
    }
  }
};

// Handle worker termination
self.addEventListener('beforeunload', () => {
  // Cleanup resources
  self.close();
});
