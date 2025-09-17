import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  RotateCcw,
  Maximize,
  Minimize,
  Focus
} from 'lucide-react';
import { useOptimizedVinScanner } from '@/hooks/useOptimizedVinScanner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartFocusVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string, confidence: number) => void;
  autoFocus?: boolean;
  showTargetingGuides?: boolean;
}

interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export function SmartFocusVinScanner({
  open,
  onClose,
  onVinDetected,
  autoFocus = true,
  showTargetingGuides = true
}: SmartFocusVinScannerProps) {
  const { t } = useTranslation();
  const { scanVin, loading, progress, error, cancelScan } = useOptimizedVinScanner();

  // Camera and canvas refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Smart focus state
  const [cameraActive, setCameraActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [focusRegion, setFocusRegion] = useState<DetectedRegion | null>(null);
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(autoFocus);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScanResult, setLastScanResult] = useState<{
    vin: string;
    confidence: number;
    timestamp: Date;
  } | null>(null);

  // Auto-scan interval
  const autoScanRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera with enhanced settings
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);

        // Start auto-detection of VIN regions
        if (autoZoomEnabled) {
          startAutoDetection();
        }
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError(t('vin_scanner.camera_access_denied'));
    }
  }, [autoZoomEnabled, t]);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFocusRegion(null);
    setZoomLevel(1);

    if (autoScanRef.current) {
      clearInterval(autoScanRef.current);
      autoScanRef.current = null;
    }
  }, []);

  // Detect potential VIN regions in video frame
  const detectVinRegions = useCallback(async (): Promise<DetectedRegion[]> => {
    if (!videoRef.current || !canvasRef.current) return [];

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return [];

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Simple edge detection for text regions
    const regions = await findTextRegions(imageData);

    // Filter regions that might contain VINs (rectangular, appropriate size)
    return regions.filter(region => {
      const aspectRatio = region.width / region.height;
      return aspectRatio > 2 && aspectRatio < 8 && region.width > 100;
    });
  }, []);

  // Enhanced text region detection
  const findTextRegions = async (imageData: ImageData): Promise<DetectedRegion[]> => {
    const { data, width, height } = imageData;
    const regions: DetectedRegion[] = [];

    // Simple gradient-based edge detection
    const edges = new Uint8ClampedArray(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // Convert to grayscale
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Sobel edge detection
        const gx = (-1 * data[((y-1) * width + (x-1)) * 4] +
                   1 * data[((y-1) * width + (x+1)) * 4] +
                   -2 * data[(y * width + (x-1)) * 4] +
                   2 * data[(y * width + (x+1)) * 4] +
                   -1 * data[((y+1) * width + (x-1)) * 4] +
                   1 * data[((y+1) * width + (x+1)) * 4]) / 3;

        const gy = (-1 * data[((y-1) * width + (x-1)) * 4] +
                   -2 * data[((y-1) * width + x) * 4] +
                   -1 * data[((y-1) * width + (x+1)) * 4] +
                   1 * data[((y+1) * width + (x-1)) * 4] +
                   2 * data[((y+1) * width + x) * 4] +
                   1 * data[((y+1) * width + (x+1)) * 4]) / 3;

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }

    // Find connected components (simplified)
    const minRegionSize = 50 * 20; // Minimum VIN region size
    const visited = new Set<number>();

    for (let y = 0; y < height - 20; y += 10) {
      for (let x = 0; x < width - 200; x += 10) {
        if (visited.has(y * width + x)) continue;

        const region = floodFill(edges, width, height, x, y, visited);
        if (region.width * region.height > minRegionSize) {
          regions.push({
            ...region,
            confidence: Math.min(region.width * region.height / minRegionSize, 1.0)
          });
        }
      }
    }

    return regions.slice(0, 5); // Return top 5 regions
  };

  // Flood fill algorithm for region detection
  const floodFill = (
    edges: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ): DetectedRegion => {
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;

    const stack = [{x: startX, y: startY}];

    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      const idx = y * width + x;

      if (visited.has(idx) || x < 0 || x >= width || y < 0 || y >= height || edges[idx] < 128) {
        continue;
      }

      visited.add(idx);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add neighbors
      stack.push(
        {x: x + 1, y}, {x: x - 1, y},
        {x, y: y + 1}, {x, y: y - 1}
      );
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      confidence: 0.5
    };
  };

  // Auto-detection and focusing
  const startAutoDetection = useCallback(() => {
    if (autoScanRef.current) return;

    autoScanRef.current = setInterval(async () => {
      if (!cameraActive || loading) return;

      try {
        const regions = await detectVinRegions();

        if (regions.length > 0) {
          // Sort by confidence and size
          const bestRegion = regions
            .sort((a, b) => (b.confidence * b.width * b.height) - (a.confidence * a.width * a.height))[0];

          setFocusRegion(bestRegion);

          // Auto-zoom to region if confidence is high enough
          if (bestRegion.confidence > 0.7 && autoZoomEnabled) {
            const videoWidth = videoRef.current?.videoWidth || 1;
            const videoHeight = videoRef.current?.videoHeight || 1;

            const centerX = bestRegion.x + bestRegion.width / 2;
            const centerY = bestRegion.y + bestRegion.height / 2;

            // Calculate optimal zoom level
            const targetZoom = Math.min(
              videoWidth / (bestRegion.width * 1.5),
              videoHeight / (bestRegion.height * 1.5),
              3.0 // Max zoom
            );

            setZoomLevel(targetZoom);
          }
        }
      } catch (error) {
        console.error('Auto-detection error:', error);
      }
    }, 1000); // Check every second
  }, [cameraActive, loading, autoZoomEnabled, detectVinRegions]);

  // Capture and scan current frame
  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanAttempts(prev => prev + 1);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas size and capture frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Convert to blob for processing
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          const result = await scanVin(blob, {
            language: 'eng',
            enableLogging: true,
            useCache: true
          });

          if (result.vins.length > 0) {
            const bestVin = result.vins[0];
            setLastScanResult({
              vin: bestVin,
              confidence: result.confidence,
              timestamp: new Date()
            });

            onVinDetected(bestVin, result.confidence);
          }
        } catch (error) {
          console.error('Scan error:', error);
          setError(error instanceof Error ? error.message : 'Scan failed');
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Capture error:', error);
      setError(t('vin_scanner.capture_failed'));
    }
  }, [scanVin, onVinDetected, t]);

  // Camera controls
  const toggleAutoZoom = useCallback(() => {
    setAutoZoomEnabled(prev => !prev);
    if (!autoZoomEnabled) {
      setZoomLevel(1);
      setFocusRegion(null);
    }
  }, [autoZoomEnabled]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setFocusRegion(null);
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    setZoomLevel(prev => Math.max(1, Math.min(5, prev + delta)));
  }, []);

  // Initialize camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera();
      setScanAttempts(0);
      setLastScanResult(null);
    } else {
      stopCamera();
      cancelScan();
    }

    return () => {
      stopCamera();
      cancelScan();
    };
  }, [open, startCamera, stopCamera, cancelScan]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <Card className="border-border shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Focus className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t('vin_scanner.smart_focus_title')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('vin_scanner.smart_focus_description')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {autoZoomEnabled ? t('vin_scanner.auto_focus_on') : t('vin_scanner.auto_focus_off')}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress and Controls */}
                <div className="space-y-3">
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{t('vin_scanner.processing')}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Camera Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={autoZoomEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleAutoZoom}
                      className="flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      {t('vin_scanner.auto_focus')}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetZoom}
                      disabled={zoomLevel === 1}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('vin_scanner.reset_zoom')}
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustZoom(-0.5)}
                        disabled={zoomLevel <= 1}
                      >
                        <Minimize className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-mono min-w-[3rem] text-center">
                        {zoomLevel.toFixed(1)}x
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustZoom(0.5)}
                        disabled={zoomLevel >= 5}
                      >
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>

                    <Badge variant="secondary" className="ml-auto">
                      {t('vin_scanner.attempts')}: {scanAttempts}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {/* Video Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-300",
                      zoomLevel > 1 && "cursor-move"
                    )}
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: focusRegion
                        ? `${(focusRegion.x + focusRegion.width/2) / (videoRef.current?.videoWidth || 1) * 100}% ${(focusRegion.y + focusRegion.height/2) / (videoRef.current?.videoHeight || 1) * 100}%`
                        : 'center'
                    }}
                  />

                  {/* Hidden canvas for frame capture */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Targeting Guides */}
                  {showTargetingGuides && cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Center crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-32 border-2 border-primary/50 rounded-lg">
                          <div className="w-full h-full border border-primary/30 rounded-lg m-1">
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-primary/70 text-xs font-medium bg-background/80 px-2 py-1 rounded">
                                {t('vin_scanner.align_vin_here')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detected regions highlight */}
                      {focusRegion && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute border-2 border-success rounded-md"
                          style={{
                            left: `${(focusRegion.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                            top: `${(focusRegion.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                            width: `${(focusRegion.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                            height: `${(focusRegion.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
                          }}
                        >
                          <div className="absolute -top-6 left-0">
                            <Badge variant="default" className="bg-success text-success-foreground text-xs">
                              {t('vin_scanner.detected_region')} ({(focusRegion.confidence * 100).toFixed(0)}%)
                            </Badge>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Camera status overlay */}
                  {!cameraActive && (
                    <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold">{t('vin_scanner.camera_starting')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('vin_scanner.allow_camera_access')}
                          </p>
                        </div>
                        <Button onClick={startCamera} className="button-enhanced">
                          <Camera className="w-4 h-4 mr-2" />
                          {t('vin_scanner.start_camera')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      {lastScanResult ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium">
                            {t('vin_scanner.last_scan')}: {lastScanResult.vin}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {(lastScanResult.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {t('vin_scanner.ready_to_scan')}
                        </div>
                      )}

                      {error && (
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">{error}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={onClose}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={captureAndScan}
                        disabled={!cameraActive || loading}
                        className="button-enhanced"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {loading ? t('vin_scanner.scanning') : t('vin_scanner.scan_now')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}