interface StickerRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type: 'barcode' | 'vin' | 'info' | 'unknown';
}

interface StickerProcessingResult {
  processedImage: ImageData;
  detectedRegions: StickerRegion[];
  stickerBounds: { x: number; y: number; width: number; height: number } | null;
  processingTime: number;
}

export class StickerImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Main processing function for dealership stickers
  public async processStickerImage(
    imageSource: File | Blob | string | HTMLImageElement
  ): Promise<StickerProcessingResult> {
    const startTime = Date.now();

    try {
      // Load image
      const img = await this.loadImage(imageSource);

      // Set canvas size
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      this.ctx.drawImage(img, 0, 0);

      // Get image data
      let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      // Step 1: Detect sticker bounds
      const stickerBounds = this.detectStickerBounds(imageData);

      // Step 2: Crop to sticker region if found
      if (stickerBounds) {
        imageData = this.cropToRegion(imageData, stickerBounds);
      }

      // Step 3: Preprocess for optimal OCR
      const processedImage = this.preprocessForOCR(imageData);

      // Step 4: Detect text regions within sticker
      const detectedRegions = this.detectTextRegions(processedImage);

      return {
        processedImage,
        detectedRegions,
        stickerBounds,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Sticker processing error:', error);
      throw new Error(`Failed to process sticker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Load image from various sources
  private loadImage(source: File | Blob | string | HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLImageElement) {
        resolve(source);
        return;
      }

      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      if (typeof source === 'string') {
        img.src = source;
      } else {
        img.src = URL.createObjectURL(source);
      }
    });
  }

  // Detect white rectangular sticker bounds against metallic background
  private detectStickerBounds(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
    const { data, width, height } = imageData;

    // Convert to grayscale for easier processing
    const grayData = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      grayData[i / 4] = gray;
    }

    // Apply Gaussian blur to reduce noise
    const blurred = this.gaussianBlur(grayData, width, height, 2);

    // Threshold to separate white sticker from dark background
    const threshold = this.calculateAdaptiveThreshold(blurred, width, height);
    const binary = blurred.map(pixel => pixel > threshold ? 255 : 0);

    // Find largest white rectangular region
    const regions = this.findRectangularRegions(binary, width, height);

    // Filter for sticker-like regions (aspect ratio, size)
    const stickerCandidates = regions.filter(region => {
      const aspectRatio = region.width / region.height;
      const area = region.width * region.height;
      const minArea = (width * height) * 0.02; // At least 2% of image
      const maxArea = (width * height) * 0.5;  // At most 50% of image

      return (
        aspectRatio > 1.5 && aspectRatio < 4.0 && // Typical sticker aspect ratio
        area > minArea && area < maxArea &&
        region.width > 100 && region.height > 30   // Minimum sticker size
      );
    });

    // Return largest candidate
    return stickerCandidates.length > 0
      ? stickerCandidates.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
      : null;
  }

  // Gaussian blur for noise reduction
  private gaussianBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);
    const kernel = this.generateGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const pixelY = y + ky - halfKernel;
            const pixelX = x + kx - halfKernel;
            const pixelIndex = pixelY * width + pixelX;
            const weight = kernel[ky][kx];

            sum += data[pixelIndex] * weight;
            weightSum += weight;
          }
        }

        result[y * width + x] = sum / weightSum;
      }
    }

    return result;
  }

  // Generate Gaussian kernel
  private generateGaussianKernel(radius: number): number[][] {
    const size = radius * 2 + 1;
    const kernel: number[][] = [];
    const sigma = radius / 3;
    let sum = 0;

    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const distance = Math.sqrt((x - radius) ** 2 + (y - radius) ** 2);
        const weight = Math.exp(-(distance ** 2) / (2 * sigma ** 2));
        kernel[y][x] = weight;
        sum += weight;
      }
    }

    // Normalize kernel
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }

    return kernel;
  }

  // Calculate adaptive threshold for sticker detection
  private calculateAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number): number {
    // Use Otsu's method for automatic threshold
    const histogram = new Array(256).fill(0);

    // Build histogram
    for (const pixel of data) {
      histogram[Math.floor(pixel)]++;
    }

    const total = data.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let maximum = 0;
    let level = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      const wF = total - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const between = wB * wF * (mB - mF) ** 2;
      if (between > maximum) {
        level = t;
        maximum = between;
      }
    }

    return level;
  }

  // Find rectangular regions in binary image
  private findRectangularRegions(
    binary: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const visited = new Set<number>();
    const regions: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (binary[index] === 255 && !visited.has(index)) {
          const region = this.floodFillRectangle(binary, width, height, x, y, visited);
          if (region.width > 50 && region.height > 20) {
            regions.push(region);
          }
        }
      }
    }

    return regions.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  }

  // Flood fill to find connected white regions
  private floodFillRectangle(
    binary: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ): { x: number; y: number; width: number; height: number } {
    const stack = [{ x: startX, y: startY }];
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const index = y * width + x;

      if (
        x < 0 || x >= width || y < 0 || y >= height ||
        visited.has(index) || binary[index] !== 255
      ) {
        continue;
      }

      visited.add(index);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add 4-connected neighbors
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  // Crop image to specific region
  private cropToRegion(
    imageData: ImageData,
    region: { x: number; y: number; width: number; height: number }
  ): ImageData {
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d')!;

    croppedCanvas.width = region.width;
    croppedCanvas.height = region.height;

    // Put original image data back to main canvas
    this.ctx.putImageData(imageData, 0, 0);

    // Draw cropped region
    croppedCtx.drawImage(
      this.canvas,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );

    return croppedCtx.getImageData(0, 0, region.width, region.height);
  }

  // Enhanced preprocessing specifically for stickers
  private preprocessForOCR(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    const processed = new ImageData(width, height);
    const processedData = processed.data;

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

      // Apply high contrast enhancement for text clarity
      let enhanced: number;
      if (gray > 200) {
        enhanced = 255; // Pure white for background
      } else if (gray < 100) {
        enhanced = 0;   // Pure black for text
      } else {
        // Sharpen mid-tones
        enhanced = gray > 150 ? 255 : 0;
      }

      processedData[i] = enhanced;     // Red
      processedData[i + 1] = enhanced; // Green
      processedData[i + 2] = enhanced; // Blue
      processedData[i + 3] = data[i + 3]; // Alpha
    }

    return processed;
  }

  // Detect text regions within sticker (barcode, VIN, info)
  private detectTextRegions(imageData: ImageData): StickerRegion[] {
    const { data, width, height } = imageData;
    const regions: StickerRegion[] = [];

    // Horizontal projection to find text lines
    const horizontalProjection = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        if (data[pixelIndex] === 0) { // Black pixels (text)
          horizontalProjection[y]++;
        }
      }
    }

    // Find text line boundaries
    const textLines: Array<{ start: number; end: number; density: number }> = [];
    let lineStart = -1;
    let lineEnd = -1;

    for (let y = 0; y < height; y++) {
      const hasText = horizontalProjection[y] > width * 0.1; // At least 10% text

      if (hasText && lineStart === -1) {
        lineStart = y;
      } else if (!hasText && lineStart !== -1) {
        lineEnd = y - 1;
        const lineDensity = horizontalProjection.slice(lineStart, lineEnd + 1)
          .reduce((sum, val) => sum + val, 0) / (lineEnd - lineStart + 1);

        textLines.push({
          start: lineStart,
          end: lineEnd,
          density: lineDensity
        });

        lineStart = -1;
      }
    }

    // Classify text lines based on typical sticker layout
    textLines.forEach((line, index) => {
      const regionHeight = line.end - line.start + 1;
      const y = line.start;

      let regionType: StickerRegion['type'] = 'unknown';
      let confidence = 0.5;

      // Classify based on position and characteristics
      if (index === 0 && regionHeight < height * 0.3) {
        // First region, likely barcode
        regionType = 'barcode';
        confidence = 0.8;
      } else if (regionHeight > height * 0.2 && line.density > width * 0.15) {
        // Large region with high density, likely main VIN
        regionType = 'vin';
        confidence = 0.9;
      } else if (index === textLines.length - 1) {
        // Last region, likely additional info
        regionType = 'info';
        confidence = 0.6;
      }

      regions.push({
        x: 0,
        y,
        width,
        height: regionHeight,
        confidence,
        type: regionType
      });
    });

    return regions;
  }

  // Get the VIN region specifically for OCR
  public getVinRegion(regions: StickerRegion[]): StickerRegion | null {
    // Look for VIN region first
    const vinRegion = regions.find(r => r.type === 'vin');
    if (vinRegion) return vinRegion;

    // Fallback: find region with highest density (likely VIN)
    const sortedByDensity = regions
      .filter(r => r.height > 15) // Minimum height for VIN text
      .sort((a, b) => b.confidence - a.confidence);

    return sortedByDensity[0] || null;
  }

  // Get barcode region for additional validation
  public getBarcodeRegion(regions: StickerRegion[]): StickerRegion | null {
    return regions.find(r => r.type === 'barcode') || null;
  }

  // Extract region from processed image
  public extractRegion(imageData: ImageData, region: StickerRegion): ImageData {
    return this.cropToRegion(imageData, region);
  }

  // Convert processed image to blob for Tesseract
  public imageDataToBlob(imageData: ImageData): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  }

  // Get processing statistics
  public getProcessingStats(result: StickerProcessingResult): object {
    return {
      processingTime: result.processingTime,
      regionsDetected: result.detectedRegions.length,
      stickerFound: result.stickerBounds !== null,
      vinRegionConfidence: result.detectedRegions.find(r => r.type === 'vin')?.confidence || 0,
      regionTypes: result.detectedRegions.map(r => r.type)
    };
  }

  // Clean up resources
  public dispose(): void {
    // Canvas cleanup handled by garbage collector
  }
}