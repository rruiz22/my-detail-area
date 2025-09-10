import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVinScanner } from './useVinScanner';
import { useMultiEngineOCR } from '@/components/scanner/engines/MultiEngineOCR';
import { useImagePreprocessor } from '@/components/scanner/engines/ImagePreprocessor';
import { useRegionDetector } from '@/components/scanner/engines/RegionDetector';
import { useVinValidator } from '@/components/scanner/engines/VinValidator';

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
  const { processMultiEngine } = useMultiEngineOCR();
  const { preprocessImage } = useImagePreprocessor();
  const { detectTextRegions } = useRegionDetector();
  const { validateVin, suggestCorrections } = useVinValidator();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhanced VIN validation with confidence scoring
  const validateVinWithConfidence = (vin: string): { isValid: boolean; confidence: number } => {
    const validation = validateVin(vin);
    return {
      isValid: validation.isValid,
      confidence: validation.confidence
    };
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
      
      // Step 1: Image preprocessing if it's a Blob/File
      onConfidenceUpdate?.(0.1);
      let processedImage: File | Blob | string = imageSource;
      
      if (typeof imageSource === 'object' && imageSource instanceof File) {
        try {
          const preprocessResult = await preprocessImage(imageSource, {
            enhanceContrast: true,
            denoiseImage: true,
            targetSize: { width: 1920, height: 1080 }
          });
          processedImage = preprocessResult.processedImage;
          onConfidenceUpdate?.(0.2);
        } catch (preprocessError) {
          console.warn('Preprocessing failed, using original image:', preprocessError);
        }
      } else if (typeof imageSource === 'object' && imageSource instanceof Blob) {
        try {
          const preprocessResult = await preprocessImage(imageSource, {
            enhanceContrast: true,
            denoiseImage: true,
            targetSize: { width: 1920, height: 1080 }
          });
          processedImage = preprocessResult.processedImage;
          onConfidenceUpdate?.(0.2);
        } catch (preprocessError) {
          console.warn('Preprocessing failed, using original image:', preprocessError);
        }
      }

      // Step 2: Region detection for VIN stickers
      onConfidenceUpdate?.(0.3);
      let vinRegions: any[] = [];
      
      if (typeof processedImage === 'object' && processedImage instanceof Blob) {
        try {
          vinRegions = await detectTextRegions(processedImage, {
            targetType: 'vin_sticker',
            minConfidence: 0.5,
            maxRegions: 5
          });
          onConfidenceUpdate?.(0.4);
        } catch (regionError) {
          console.warn('Region detection failed:', regionError);
        }
      }

      // Step 3: Multi-engine OCR processing
      onConfidenceUpdate?.(0.5);
      
      // Convert Blob to File if needed for basic scanner
      let scanSource: File | Blob | string = processedImage;
      if (typeof processedImage === 'object' && processedImage instanceof Blob && !(processedImage instanceof File)) {
        scanSource = new File([processedImage], 'capture.jpg', { type: 'image/jpeg' });
      }
      
      // Use multi-engine OCR
      const ocrResults = await processMultiEngine(scanSource as File | Blob | string, onConfidenceUpdate);
      
      // Process OCR results
      for (const ocrResult of ocrResults) {
        // Extract potential VINs from OCR text
        const vinPattern = /[A-HJ-NPR-Z0-9]{17}/g;
        const matches = ocrResult.text.match(vinPattern) || [];
        
        for (const vin of matches) {
          const validation = validateVin(vin);
          if (validation.isValid) {
            results.push({
              vin,
              confidence: Math.min(1, validation.confidence * ocrResult.confidence),
              source: ocrResult.engine as 'tesseract' | 'enhanced' | 'region-detected'
            });
          }
        }
      }

      // Fallback to basic scanning if no results
      if (results.length === 0) {
        onConfidenceUpdate?.(0.7);
        const basicVins = await basicScanVin(scanSource as File | string);
        
        for (const vin of basicVins) {
          const validation = validateVin(vin);
          if (validation.isValid) {
            results.push({
              vin,
              confidence: validation.confidence * 0.8, // Scale down as it's basic OCR
              source: 'tesseract'
            });
          } else if (validation.confidence > 0.3) {
            // Try corrections for low-confidence VINs
            const suggestions = suggestCorrections(vin);
            for (const suggestion of suggestions) {
              const suggestionValidation = validateVin(suggestion);
              if (suggestionValidation.isValid) {
                results.push({
                  vin: suggestion,
                  confidence: suggestionValidation.confidence * 0.7,
                  source: 'tesseract'
                });
              }
            }
          }
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
  }, [basicScanVin, processMultiEngine, preprocessImage, detectTextRegions, validateVin, suggestCorrections, t]);

  return {
    scanVin,
    loading: loading || basicLoading,
    error
  };
}