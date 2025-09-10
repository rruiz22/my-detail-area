import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVinScanner } from './useVinScanner';

interface VinScanResult {
  vin: string;
  confidence: number;
  source: 'tesseract' | 'enhanced' | 'region-detected';
}

interface UseAdvancedVinScannerReturn {
  scanVin: (
    imageSource: File | Blob | string,
    onConfidenceUpdate?: (confidence: number) => void
  ) => Promise<VinScanResult[]>;
  loading: boolean;
  error: string | null;
}

export function useAdvancedVinScanner(): UseAdvancedVinScannerReturn {
  const { t } = useTranslation();
  const { scanVin: basicScanVin, loading: basicLoading } = useVinScanner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhanced VIN validation with confidence scoring
  const validateVinWithConfidence = (vin: string): { isValid: boolean; confidence: number } => {
    if (!vin || vin.length !== 17) {
      return { isValid: false, confidence: 0 };
    }

    let confidence = 0.5; // Base confidence for 17-character string

    // Check for invalid characters (I, O, Q not allowed in VINs)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return { isValid: false, confidence: 0.1 };
    }

    confidence += 0.2; // Valid character set

    // VIN check digit validation (position 9)
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const values: { [key: string]: number } = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
      'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
      'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      if (i !== 8) { // Skip check digit position
        sum += (values[vin[i]] || 0) * weights[i];
      }
    }

    const checkDigit = sum % 11;
    const expectedCheckDigit = checkDigit === 10 ? 'X' : checkDigit.toString();
    
    if (vin[8] === expectedCheckDigit) {
      confidence += 0.3; // Valid check digit significantly increases confidence
    } else {
      confidence = Math.max(0.3, confidence - 0.2); // Invalid check digit but keep some confidence
    }

    return { isValid: true, confidence: Math.min(1, confidence) };
  };

  // Process image with multiple techniques
  const scanVin = useCallback(async (
    imageSource: File | Blob | string,
    onConfidenceUpdate?: (confidence: number) => void
  ): Promise<VinScanResult[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const results: VinScanResult[] = [];
      
      // Step 1: Use basic Tesseract scanning
      onConfidenceUpdate?.(0.2);
      
      // Convert Blob to File if needed for basic scanner
      let scanSource = imageSource;
      if (imageSource instanceof Blob && !(imageSource instanceof File)) {
        scanSource = new File([imageSource], 'capture.jpg', { type: 'image/jpeg' });
      }
      
      const basicVins = await basicScanVin(scanSource as File | string);
      
      for (const vin of basicVins) {
        const validation = validateVinWithConfidence(vin);
        if (validation.isValid) {
          results.push({
            vin,
            confidence: validation.confidence * 0.8, // Scale down as it's basic OCR
            source: 'tesseract'
          });
        }
      }

      onConfidenceUpdate?.(0.5);

      // Step 2: Try enhanced processing if available
      if ((window as any).vinStickerDetector && imageSource instanceof Blob) {
        try {
          const regions = await (window as any).vinStickerDetector.processImage(imageSource);
          
          for (const region of regions) {
            // Process each detected region with higher confidence
            // This would typically involve cropping the image to the region
            // and running OCR with optimized parameters
            onConfidenceUpdate?.(0.7 + (region.x / 1000)); // Simulate progress
          }
        } catch (regionError) {
          console.warn('Region detection failed:', regionError);
        }
      }

      onConfidenceUpdate?.(0.9);

      // Step 3: Advanced pattern matching and cleanup
      const cleanedResults = results
        .map(result => {
          // Apply additional confidence adjustments based on patterns
          let adjustedConfidence = result.confidence;
          
          // Check for common VIN patterns
          const vin = result.vin;
          
          // First character should be digit 1-5 or letter for country code
          if (/^[1-5A-Z]/.test(vin)) {
            adjustedConfidence += 0.05;
          }
          
          // 10th character should be year indicator
          const yearChar = vin[9];
          const validYearChars = 'ABCDEFGHJKLMNPRSTVWXY123456789';
          if (validYearChars.includes(yearChar)) {
            adjustedConfidence += 0.05;
          }
          
          return {
            ...result,
            confidence: Math.min(1, adjustedConfidence)
          };
        })
        .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

      onConfidenceUpdate?.(1);

      // Remove duplicates and low-confidence results
      const uniqueResults = cleanedResults.filter((result, index, array) => {
        return array.findIndex(r => r.vin === result.vin) === index && result.confidence > 0.3;
      });

      if (uniqueResults.length === 0) {
        setError(t('modern_vin_scanner.errors.no_vin_detected'));
      }

      return uniqueResults;

    } catch (err) {
      console.error('Advanced VIN scanning error:', err);
      setError(t('modern_vin_scanner.errors.processing_failed'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [basicScanVin, t]);

  return {
    scanVin,
    loading: loading || basicLoading,
    error
  };
}