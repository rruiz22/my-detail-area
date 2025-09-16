import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface VinStickerDetectorProps {
  onRegionDetected?: (region: { x: number; y: number; width: number; height: number }) => void;
}

export function VinStickerDetector({ onRegionDetected }: VinStickerDetectorProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Image preprocessing for better OCR results
  const preprocessImage = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      
      // Enhanced contrast
      const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
      
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green
      data[i + 2] = enhanced; // Blue
      // Alpha channel remains unchanged
    }
    
    return imageData;
  };

  // Edge detection for VIN sticker boundaries
  const detectEdges = (imageData: ImageData): number[][] => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges: number[][] = [];
    
    // Sobel edge detection kernel
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let y = 1; y < height - 1; y++) {
      edges[y] = [];
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel operator
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = (y + ky) * width + (x + kx);
            const intensity = data[pixel * 4]; // Use red channel as grayscale
            
            gx += intensity * sobelX[ky + 1][kx + 1];
            gy += intensity * sobelY[ky + 1][kx + 1];
          }
        }
        
        edges[y][x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edges;
  };

  // Find rectangular regions that might contain VIN stickers
  const findVinRegions = (edges: number[][], threshold: number = 50): Array<{x: number, y: number, width: number, height: number}> => {
    const regions: Array<{x: number, y: number, width: number, height: number}> = [];
    const height = edges.length;
    const width = edges[0]?.length || 0;
    
    // Look for rectangular patterns typical of VIN stickers
    for (let y = 0; y < height - 30; y += 5) {
      for (let x = 0; x < width - 150; x += 10) {
        let edgeScore = 0;
        const regionWidth = Math.min(200, width - x);
        const regionHeight = Math.min(40, height - y);
        
        // Sample edge strength in this region
        for (let dy = 0; dy < regionHeight; dy += 2) {
          for (let dx = 0; dx < regionWidth; dx += 4) {
            if (edges[y + dy] && edges[y + dy][x + dx]) {
              edgeScore += edges[y + dy][x + dx];
            }
          }
        }
        
        // Normalize score by region size
        const normalizedScore = edgeScore / (regionWidth * regionHeight / 8);
        
        // If this region has strong edges (typical of text), consider it a candidate
        if (normalizedScore > threshold) {
          regions.push({
            x: x,
            y: y,
            width: regionWidth,
            height: regionHeight
          });
        }
      }
    }
    
    // Sort regions by score and return top candidates
    return regions.slice(0, 3);
  };

  // Process image to detect VIN sticker regions
  const processImage = useCallback(async (imageBlob: Blob): Promise<Array<{x: number, y: number, width: number, height: number}>> => {
    return new Promise((resolve) => {
      setIsProcessing(true);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve([]);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Preprocess image
        const processedData = preprocessImage(imageData);

        // Detect edges
        const edges = detectEdges(processedData);

        // Find VIN regions
        const regions = findVinRegions(edges);

        setIsProcessing(false);
        resolve(regions);
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  }, []);

  // Expose processImage function to parent components
  useEffect(() => {
    // Add global reference for other components to use
    (window as Window & { vinStickerDetector?: { processImage: typeof processImage; isProcessing: boolean } }).vinStickerDetector = {
      processImage,
      isProcessing
    };

    return () => {
      delete (window as Window & { vinStickerDetector?: { processImage: typeof processImage; isProcessing: boolean } }).vinStickerDetector;
    };
  }, [processImage, isProcessing]);

  return (
    <>
      {/* Hidden canvas for image processing */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={1920}
        height={1080}
      />
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-3 shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium">
              {t('modern_vin_scanner.analyzing_image')}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
