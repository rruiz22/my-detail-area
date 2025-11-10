/**
 * Barcode Scanner Support Detection
 *
 * Detects which barcode scanning engine is available in the browser:
 * - Native Barcode Detection API (Chrome/Edge)
 * - ZXing-JS fallback (Universal)
 */

export type BarcodeEngineType = 'native' | 'zxing';

export interface BarcodeEngineCapabilities {
  engine: BarcodeEngineType;
  supportedFormats: string[];
  isHardwareAccelerated: boolean;
}

/**
 * Detect which barcode scanning engine to use
 * @returns 'native' if Barcode Detection API available, 'zxing' as fallback
 */
export function detectBarcodeSupport(): BarcodeEngineType {
  // Check for native Barcode Detection API (Chrome/Edge)
  if ('BarcodeDetector' in window) {
    return 'native';
  }

  // Fallback to ZXing-JS (universal)
  return 'zxing';
}

/**
 * Get supported barcode formats for the current engine
 * @returns Array of supported format strings
 */
export async function checkBarcodeFormats(): Promise<string[]> {
  try {
    if ('BarcodeDetector' in window) {
      // Get formats from native API
      const formats = await (window as any).BarcodeDetector.getSupportedFormats();
      return formats;
    }
  } catch (error) {
    console.warn('Failed to get supported formats from Barcode Detection API:', error);
  }

  // ZXing supports these VIN-relevant formats
  return ['code_39', 'code_128', 'code_93', 'ean_13', 'ean_8'];
}

/**
 * Get detailed capabilities of the current barcode scanner
 * @returns Engine capabilities object
 */
export async function getBarcodeEngineCapabilities(): Promise<BarcodeEngineCapabilities> {
  const engine = detectBarcodeSupport();
  const supportedFormats = await checkBarcodeFormats();

  return {
    engine,
    supportedFormats,
    isHardwareAccelerated: engine === 'native',
  };
}

/**
 * Check if a specific format is supported
 * @param format - Barcode format to check (e.g., 'code_39', 'code_128')
 * @returns Boolean indicating support
 */
export async function isFormatSupported(format: string): Promise<boolean> {
  const formats = await checkBarcodeFormats();
  return formats.includes(format.toLowerCase());
}

/**
 * Log barcode engine info for debugging
 */
export async function logBarcodeEngineInfo(): Promise<void> {
  const capabilities = await getBarcodeEngineCapabilities();

  console.group('🔍 Barcode Scanner Engine');
  console.log('Engine:', capabilities.engine.toUpperCase());
  console.log('Hardware Accelerated:', capabilities.isHardwareAccelerated);
  console.log('Supported Formats:', capabilities.supportedFormats.join(', '));
  console.groupEnd();
}
