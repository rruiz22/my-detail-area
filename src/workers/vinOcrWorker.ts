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

// VIN pattern regex for better accuracy
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;

// Enhanced VIN validation
function validateVin(vin: string): { isValid: boolean; confidence: number } {
  if (!vin || vin.length !== 17) {
    return { isValid: false, confidence: 0 };
  }

  // Remove invalid characters (I, O, Q not allowed in VINs)
  if (/[IOQ]/.test(vin)) {
    return { isValid: false, confidence: 0.1 };
  }

  // Check digit validation (position 9)
  const checkDigit = vin.charAt(8);
  const calculatedCheckDigit = calculateCheckDigit(vin);

  if (checkDigit === calculatedCheckDigit || checkDigit === 'X') {
    return { isValid: true, confidence: 0.95 };
  }

  return { isValid: false, confidence: 0.3 };
}

function calculateCheckDigit(vin: string): string {
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const values: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue; // Skip check digit position
    const char = vin.charAt(i);
    sum += (values[char] || 0) * weights[i];
  }

  const remainder = sum % 11;
  return remainder === 10 ? 'X' : remainder.toString();
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
    if (candidate !== baseText && validateVin(candidate).isValid) {
      suggestions.push(candidate);
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