import { useCallback, useRef } from 'react';

interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type: 'vin_sticker' | 'vin_plate' | 'text_region';
}

interface RegionDetectionOptions {
  minConfidence?: number;
  maxRegions?: number;
  targetType?: 'vin_sticker' | 'vin_plate' | 'any';
}

export function useRegionDetector() {
  const canvasRef = useRef<HTMLCanvasElement>();

  const createCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    return canvasRef.current;
  }, []);

  const detectEdges = useCallback((
    imageData: ImageData,
    canvas: HTMLCanvasElement
  ): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data.length);

    // Sobel edge detection
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let pixelX = 0;
        let pixelY = 0;

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const idx = ((y + i) * width + (x + j)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            pixelX += gray * sobelX[(i + 1) * 3 + (j + 1)];
            pixelY += gray * sobelY[(i + 1) * 3 + (j + 1)];
          }
        }

        const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
        const idx = (y * width + x) * 4;
        
        newData[idx] = Math.min(255, magnitude);
        newData[idx + 1] = Math.min(255, magnitude);
        newData[idx + 2] = Math.min(255, magnitude);
        newData[idx + 3] = 255;
      }
    }

    return new ImageData(newData, width, height);
  }, []);

  const findRectangularRegions = useCallback((
    edgeData: ImageData,
    minArea: number = 1000
  ): DetectedRegion[] => {
    const data = edgeData.data;
    const width = edgeData.width;
    const height = edgeData.height;
    const regions: DetectedRegion[] = [];

    // Simple rectangle detection using contours
    const threshold = 128;
    const visited = new Set<number>();

    for (let y = 10; y < height - 10; y += 5) {
      for (let x = 10; x < width - 10; x += 5) {
        const idx = (y * width + x) * 4;
        const intensity = data[idx];

        if (intensity > threshold && !visited.has(idx)) {
          const region = floodFill(data, width, height, x, y, threshold, visited);
          
          if (region && region.width * region.height > minArea) {
            // Check if region looks like a VIN sticker (rectangular, appropriate aspect ratio)
            const aspectRatio = region.width / region.height;
            
            let confidence = 0.3;
            let type: DetectedRegion['type'] = 'text_region';
            
            // VIN stickers are typically rectangular with aspect ratio between 2:1 and 4:1
            if (aspectRatio >= 2 && aspectRatio <= 4 && region.height >= 30) {
              confidence += 0.4;
              type = 'vin_sticker';
            }
            
            // VIN plates are more square-ish
            if (aspectRatio >= 1 && aspectRatio <= 2 && region.width >= 100) {
              confidence += 0.3;
              type = 'vin_plate';
            }

            regions.push({
              ...region,
              confidence,
              type
            });
          }
        }
      }
    }

    return regions.sort((a, b) => b.confidence - a.confidence);
  }, []);

  const floodFill = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    threshold: number,
    visited: Set<number>
  ): DetectedRegion | null => {
    const stack = [{ x: startX, y: startY }];
    const pixels: { x: number; y: number }[] = [];
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = (y * width + x) * 4;
      if (visited.has(idx)) continue;
      
      const intensity = data[idx];
      if (intensity < threshold) continue;

      visited.add(idx);
      pixels.push({ x, y });

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add neighbors
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );

      // Limit flood fill to prevent excessive processing
      if (pixels.length > 10000) break;
    }

    if (pixels.length < 50) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      confidence: 0,
      type: 'text_region'
    };
  };

  const detectVinStickerTemplate = useCallback((
    imageData: ImageData
  ): DetectedRegion[] => {
    // Template matching for common VIN sticker patterns
    const templates = [
      { width: 200, height: 50 }, // Common VIN sticker size
      { width: 150, height: 40 },
      { width: 250, height: 60 }
    ];

    const regions: DetectedRegion[] = [];
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (const template of templates) {
      for (let y = 0; y <= height - template.height; y += 10) {
        for (let x = 0; x <= width - template.width; x += 10) {
          const confidence = calculateTemplateMatch(
            data,
            width,
            height,
            x,
            y,
            template.width,
            template.height
          );

          if (confidence > 0.6) {
            regions.push({
              x,
              y,
              width: template.width,
              height: template.height,
              confidence,
              type: 'vin_sticker'
            });
          }
        }
      }
    }

    return regions;
  }, []);

  const calculateTemplateMatch = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    templateWidth: number,
    templateHeight: number
  ): number => {
    // Simplified template matching based on edge density and rectangular shape
    let edgeCount = 0;
    let totalPixels = 0;

    // Check edges of the rectangular region
    for (let y = startY; y < startY + templateHeight; y++) {
      for (let x = startX; x < startX + templateWidth; x++) {
        if (x >= width || y >= height) continue;
        
        const idx = (y * width + x) * 4;
        const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Check if this is an edge pixel
        const isEdge = intensity < 100 || intensity > 200;
        if (isEdge) edgeCount++;
        totalPixels++;
      }
    }

    // Calculate confidence based on edge density and shape
    const edgeDensity = edgeCount / totalPixels;
    const aspectRatio = templateWidth / templateHeight;
    
    let confidence = edgeDensity * 0.6;
    
    // Prefer VIN sticker aspect ratios
    if (aspectRatio >= 2 && aspectRatio <= 4) {
      confidence += 0.3;
    }
    
    return Math.min(1, confidence);
  };

  const detectTextRegions = useCallback(async (
    imageFile: File | Blob,
    options: RegionDetectionOptions = {}
  ): Promise<DetectedRegion[]> => {
    const {
      minConfidence = 0.5,
      maxRegions = 10,
      targetType = 'any'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d')!;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          
          // Detect edges
          const edgeData = detectEdges(imageData, canvas);
          
          // Find rectangular regions
          const rectangularRegions = findRectangularRegions(edgeData);
          
          // Detect VIN sticker templates
          const templateRegions = detectVinStickerTemplate(imageData);
          
          // Combine and filter results
          const allRegions = [...rectangularRegions, ...templateRegions];
          
          const filteredRegions = allRegions
            .filter(region => {
              if (region.confidence < minConfidence) return false;
              if (targetType !== 'any' && region.type !== targetType) return false;
              return true;
            })
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxRegions);

          resolve(filteredRegions);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }, [createCanvas, detectEdges, findRectangularRegions, detectVinStickerTemplate]);

  return {
    detectTextRegions,
    detectEdges,
    findRectangularRegions,
    detectVinStickerTemplate
  };
}

export function RegionDetector() {
  return null; // Hook-only component
}