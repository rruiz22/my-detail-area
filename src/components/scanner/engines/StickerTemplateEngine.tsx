import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

interface StickerTemplate {
  id: string;
  name: string;
  manufacturer: string[];
  layout: {
    barcodeRegion: { x: number; y: number; width: number; height: number };
    vinRegion: { x: number; y: number; width: number; height: number };
    infoRegion: { x: number; y: number; width: number; height: number };
  };
  ocrSettings: {
    psm: number;
    whitelist: string;
    dpi: number;
  };
  confidence: number;
}

interface StickerRecognitionResult {
  template: StickerTemplate | null;
  vin: string | null;
  barcode: string | null;
  confidence: number;
  processingTime: number;
  regions: Array<{
    type: 'barcode' | 'vin' | 'info';
    text: string;
    confidence: number;
  }>;
}

export function useStickerTemplateEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined templates for common dealership stickers
  const templates: StickerTemplate[] = [
    {
      id: 'bmw_standard',
      name: 'BMW Standard Sticker',
      manufacturer: ['BMW', 'MINI'],
      layout: {
        barcodeRegion: { x: 0, y: 0, width: 1, height: 0.25 },
        vinRegion: { x: 0, y: 0.25, width: 1, height: 0.5 },
        infoRegion: { x: 0, y: 0.75, width: 1, height: 0.25 }
      },
      ocrSettings: {
        psm: 8, // Single word
        whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        dpi: 300
      },
      confidence: 0.9
    },
    {
      id: 'ford_standard',
      name: 'Ford Standard Sticker',
      manufacturer: ['FORD', 'LINCOLN'],
      layout: {
        barcodeRegion: { x: 0, y: 0, width: 1, height: 0.2 },
        vinRegion: { x: 0, y: 0.2, width: 1, height: 0.6 },
        infoRegion: { x: 0, y: 0.8, width: 1, height: 0.2 }
      },
      ocrSettings: {
        psm: 6, // Uniform block
        whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        dpi: 300
      },
      confidence: 0.85
    },
    {
      id: 'toyota_standard',
      name: 'Toyota Standard Sticker',
      manufacturer: ['TOYOTA', 'LEXUS', 'SCION'],
      layout: {
        barcodeRegion: { x: 0, y: 0, width: 1, height: 0.3 },
        vinRegion: { x: 0, y: 0.3, width: 1, height: 0.4 },
        infoRegion: { x: 0, y: 0.7, width: 1, height: 0.3 }
      },
      ocrSettings: {
        psm: 8,
        whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        dpi: 300
      },
      confidence: 0.8
    },
    {
      id: 'generic_dealership',
      name: 'Generic Dealership Sticker',
      manufacturer: ['*'],
      layout: {
        barcodeRegion: { x: 0, y: 0, width: 1, height: 0.25 },
        vinRegion: { x: 0, y: 0.25, width: 1, height: 0.5 },
        infoRegion: { x: 0, y: 0.75, width: 1, height: 0.25 }
      },
      ocrSettings: {
        psm: 6,
        whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        dpi: 300
      },
      confidence: 0.7
    }
  ];

  // Detect which template matches the sticker
  const detectStickerTemplate = useCallback(async (
    imageData: ImageData
  ): Promise<StickerTemplate | null> => {
    // Analyze layout characteristics
    const layoutAnalysis = analyzeStickerLayout(imageData);

    // Score each template against the detected layout
    let bestTemplate: StickerTemplate | null = null;
    let bestScore = 0;

    for (const template of templates) {
      const score = calculateTemplateScore(template, layoutAnalysis);
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    return bestScore > 0.6 ? bestTemplate : null;
  }, []);

  // Analyze sticker layout characteristics
  const analyzeStickerLayout = (imageData: ImageData) => {
    const { data, width, height } = imageData;

    // Horizontal projection to find text regions
    const horizontalProjection = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        if (data[pixelIndex] === 0) { // Black pixels (text)
          horizontalProjection[y]++;
        }
      }
    }

    // Find peaks in projection (text regions)
    const peaks: Array<{ start: number; end: number; density: number }> = [];
    let inRegion = false;
    let regionStart = 0;

    for (let y = 0; y < height; y++) {
      const hasText = horizontalProjection[y] > width * 0.05;

      if (hasText && !inRegion) {
        regionStart = y;
        inRegion = true;
      } else if (!hasText && inRegion) {
        const regionEnd = y - 1;
        const density = horizontalProjection.slice(regionStart, regionEnd + 1)
          .reduce((sum, val) => sum + val, 0) / (regionEnd - regionStart + 1);

        peaks.push({
          start: regionStart,
          end: regionEnd,
          density
        });

        inRegion = false;
      }
    }

    return {
      totalPeaks: peaks.length,
      peakPositions: peaks.map(p => p.start / height), // Normalized positions
      peakDensities: peaks.map(p => p.density),
      aspectRatio: width / height
    };
  };

  // Calculate how well a template matches the detected layout
  const calculateTemplateScore = (
    template: StickerTemplate,
    layout: ReturnType<typeof analyzeStickerLayout>
  ): number => {
    let score = 0;

    // Check number of regions (should be 2-3 for typical stickers)
    if (layout.totalPeaks >= 2 && layout.totalPeaks <= 4) {
      score += 0.3;
    }

    // Check aspect ratio (dealership stickers are typically wide)
    const expectedAspectRatio = 2.5; // Typical sticker ratio
    const aspectRatioDiff = Math.abs(layout.aspectRatio - expectedAspectRatio);
    if (aspectRatioDiff < 1.0) {
      score += 0.3 * (1 - aspectRatioDiff);
    }

    // Check peak positions match template expectations
    if (layout.totalPeaks >= 2) {
      const firstPeakPos = layout.peakPositions[0];
      const lastPeakPos = layout.peakPositions[layout.peakPositions.length - 1];

      // Barcode typically in top 30%
      if (firstPeakPos < 0.3) score += 0.2;

      // Info typically in bottom 30%
      if (lastPeakPos > 0.7) score += 0.2;
    }

    return score;
  };

  // Enhanced OCR processing using template-specific settings
  const processWithTemplate = useCallback(async (
    imageData: ImageData,
    template: StickerTemplate
  ): Promise<StickerRecognitionResult> => {
    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      // Create Tesseract worker with template-specific settings
      const worker = await createWorker({
        logger: undefined, // Disable logging for performance
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      // Apply template-specific OCR parameters
      await worker.setParameters({
        tessedit_char_whitelist: template.ocrSettings.whitelist,
        tessedit_pageseg_mode: template.ocrSettings.psm,
        tessedit_ocr_engine_mode: 1, // LSTM only for better accuracy
        user_defined_dpi: template.ocrSettings.dpi.toString(),
      });

      // Convert ImageData to blob for Tesseract
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve as BlobCallback, 'image/png');
      });

      // Perform OCR
      const { data: { text, confidence } } = await worker.recognize(blob);

      // Extract VIN and barcode from text
      const vinMatch = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      const barcodeMatch = text.match(/\b\d{10,20}\b/); // Typical barcode length

      await worker.terminate();

      const result: StickerRecognitionResult = {
        template,
        vin: vinMatch ? vinMatch[0] : null,
        barcode: barcodeMatch ? barcodeMatch[0] : null,
        confidence: confidence / 100,
        processingTime: Date.now() - startTime,
        regions: [
          {
            type: 'vin',
            text: vinMatch ? vinMatch[0] : '',
            confidence: vinMatch ? confidence / 100 : 0
          },
          {
            type: 'barcode',
            text: barcodeMatch ? barcodeMatch[0] : '',
            confidence: barcodeMatch ? confidence / 100 : 0
          }
        ]
      };

      return result;

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Template processing failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Main function to process sticker with best matching template
  const processStickerWithTemplates = useCallback(async (
    imageData: ImageData
  ): Promise<StickerRecognitionResult> => {
    try {
      // Detect best matching template
      const template = await detectStickerTemplate(imageData);

      if (!template) {
        // Fall back to generic template
        const genericTemplate = templates.find(t => t.id === 'generic_dealership')!;
        return await processWithTemplate(imageData, genericTemplate);
      }

      // Process with detected template
      return await processWithTemplate(imageData, template);

    } catch (error) {
      console.error('Sticker template processing error:', error);
      throw error;
    }
  }, [detectStickerTemplate, processWithTemplate]);

  // Get available templates
  const getAvailableTemplates = useCallback((): StickerTemplate[] => {
    return templates;
  }, []);

  // Add custom template (for learning new sticker types)
  const addCustomTemplate = useCallback((template: StickerTemplate): void => {
    templates.push(template);
    // Save to localStorage for persistence
    try {
      localStorage.setItem('customStickerTemplates', JSON.stringify(templates.filter(t => !t.id.includes('standard'))));
    } catch (error) {
      console.warn('Failed to save custom template:', error);
    }
  }, []);

  return {
    processStickerWithTemplates,
    detectStickerTemplate,
    processWithTemplate,
    getAvailableTemplates,
    addCustomTemplate,
    loading,
    error
  };
}