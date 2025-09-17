import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  Maximize,
  Focus,
  Layers,
  BarChart3
} from 'lucide-react';
import { StickerImageProcessor } from '@/components/scanner/engines/StickerImageProcessor';
import { useStickerTemplateEngine } from '@/components/scanner/engines/StickerTemplateEngine';
import { vinAutoCorrection } from '@/utils/vinAutoCorrection';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DealershipStickerScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string, confidence: number, metadata?: any) => void;
  autoCapture?: boolean;
  showGuides?: boolean;
}

interface ScanResult {
  vin: string;
  confidence: number;
  template: string;
  barcode?: string;
  processingTime: number;
  timestamp: Date;
}

export function DealershipStickerScanner({
  open,
  onClose,
  onVinDetected,
  autoCapture = true,
  showGuides = true
}: DealershipStickerScannerProps) {
  const { t } = useTranslation();
  const { processStickerWithTemplates, getAvailableTemplates, loading: templateLoading } = useStickerTemplateEngine();

  // Camera and processing state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<StickerImageProcessor | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedSticker, setDetectedSticker] = useState<{
    bounds: { x: number; y: number; width: number; height: number };
    confidence: number;
  } | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [autoScanEnabled, setAutoScanEnabled] = useState(autoCapture);

  // Auto-scan interval
  const autoScanRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize image processor
  useEffect(() => {
    processorRef.current = new StickerImageProcessor();
    return () => {
      processorRef.current?.dispose();
    };
  }, []);

  // Start camera with optimized settings for stickers
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
          focusMode: 'manual' // Better for close-up sticker scanning
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);

        // Start auto-detection if enabled
        if (autoScanEnabled) {
          startAutoDetection();
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error(t('sticker_scanner.camera_error'));
    }
  }, [autoScanEnabled, t]);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setDetectedSticker(null);
    stopAutoDetection();
  }, []);

  // Auto-detection of stickers in video feed
  const startAutoDetection = useCallback(() => {
    if (autoScanRef.current) return;

    autoScanRef.current = setInterval(async () => {
      if (!cameraActive || processing || !processorRef.current) return;

      try {
        await detectStickerInFrame();
      } catch (error) {
        console.error('Auto-detection error:', error);
      }
    }, 2000); // Check every 2 seconds
  }, [cameraActive, processing]);

  const stopAutoDetection = useCallback(() => {
    if (autoScanRef.current) {
      clearInterval(autoScanRef.current);
      autoScanRef.current = null;
    }
  }, []);

  // Detect sticker in current video frame
  const detectStickerInFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !processorRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Capture current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Quick sticker detection (no full OCR)
    try {
      const result = await processorRef.current.processStickerImage(canvas.toDataURL());

      if (result.stickerBounds) {
        setDetectedSticker({
          bounds: result.stickerBounds,
          confidence: 0.8 // Placeholder confidence
        });
      } else {
        setDetectedSticker(null);
      }
    } catch (error) {
      // Silent fail for auto-detection
      setDetectedSticker(null);
    }
  }, []);

  // Capture and process sticker
  const captureAndProcessSticker = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !processorRef.current) return;

    setProcessing(true);
    setProgress(0);
    setScanAttempts(prev => prev + 1);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Capture high-quality frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      setProgress(20);

      // Process sticker with image processor
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve as BlobCallback, 'image/png', 1.0);
      });

      setProgress(40);

      const processingResult = await processorRef.current.processStickerImage(blob);

      setProgress(60);

      // Process with template engine
      const templateResult = await processStickerWithTemplates(processingResult.processedImage);

      setProgress(80);

      if (templateResult.vin) {
        // Apply auto-correction
        const correction = vinAutoCorrection.correctVin(templateResult.vin);

        const finalVin = correction.isValid ? correction.correctedVin : templateResult.vin;
        const finalConfidence = correction.isValid ? correction.confidence : templateResult.confidence;

        const scanResult: ScanResult = {
          vin: finalVin,
          confidence: finalConfidence,
          template: templateResult.template?.name || 'Unknown',
          barcode: templateResult.barcode || undefined,
          processingTime: templateResult.processingTime,
          timestamp: new Date()
        };

        setLastResult(scanResult);
        setProgress(100);

        // Success feedback
        toast.success(t('sticker_scanner.vin_detected'), {
          description: `VIN: ${finalVin} • ${t('sticker_scanner.confidence')}: ${(finalConfidence * 100).toFixed(0)}%`
        });

        // Call parent handler
        onVinDetected(finalVin, finalConfidence, {
          barcode: templateResult.barcode,
          template: templateResult.template?.name,
          processingTime: templateResult.processingTime
        });

      } else {
        throw new Error('No VIN detected in sticker');
      }

    } catch (error) {
      console.error('Sticker scan error:', error);
      toast.error(t('sticker_scanner.scan_failed'));
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [processStickerWithTemplates, onVinDetected, t]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera();
      setScanAttempts(0);
      setLastResult(null);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

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
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                        <Layers className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{t('sticker_scanner.title')}</h2>
                        <p className="text-sm text-muted-foreground">
                          {t('sticker_scanner.subtitle')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {t('sticker_scanner.sticker_mode')}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={onClose}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress and Controls */}
                  <div className="mt-4 space-y-3">
                    {processing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{t('sticker_scanner.processing_sticker')}</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/* Scanner Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={autoScanEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                        className="flex items-center gap-2"
                      >
                        <Focus className="w-4 h-4" />
                        {t('sticker_scanner.auto_detect')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={detectStickerInFrame}
                        disabled={!cameraActive || processing}
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t('sticker_scanner.detect_sticker')}
                      </Button>

                      <div className="flex items-center gap-2 ml-auto">
                        <Badge variant="secondary">
                          {t('sticker_scanner.attempts')}: {scanAttempts}
                        </Badge>
                        <Badge variant="outline">
                          {t('sticker_scanner.templates')}: {getAvailableTemplates().length}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera View */}
                <div className="relative bg-black" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
                  {/* Video Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Hidden canvas for processing */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Sticker Detection Overlay */}
                  {showGuides && cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Sticker alignment guide */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-80 h-32 border-2 border-primary/60 rounded-lg bg-primary/5">
                          <div className="w-full h-full border border-primary/40 rounded-lg m-1 flex flex-col">
                            {/* Barcode area */}
                            <div className="flex-1 border-b border-primary/30 flex items-center justify-center">
                              <span className="text-primary/70 text-xs font-medium bg-background/80 px-2 py-1 rounded">
                                {t('sticker_scanner.barcode_area')}
                              </span>
                            </div>
                            {/* VIN area */}
                            <div className="flex-2 border-b border-primary/30 flex items-center justify-center">
                              <span className="text-primary/70 text-sm font-bold bg-background/80 px-2 py-1 rounded">
                                {t('sticker_scanner.vin_area')}
                              </span>
                            </div>
                            {/* Info area */}
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-primary/70 text-xs font-medium bg-background/80 px-2 py-1 rounded">
                                {t('sticker_scanner.info_area')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detected sticker highlight */}
                      {detectedSticker && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute border-2 border-success rounded-md bg-success/10"
                          style={{
                            left: `${(detectedSticker.bounds.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                            top: `${(detectedSticker.bounds.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                            width: `${(detectedSticker.bounds.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                            height: `${(detectedSticker.bounds.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
                          }}
                        >
                          <div className="absolute -top-6 left-0">
                            <Badge variant="default" className="bg-success text-success-foreground text-xs">
                              {t('sticker_scanner.sticker_detected')} ({(detectedSticker.confidence * 100).toFixed(0)}%)
                            </Badge>
                          </div>
                        </motion.div>
                      )}

                      {/* Corner indicators for perfect alignment */}
                      <div className="absolute top-4 left-4">
                        <div className="w-6 h-6 border-l-2 border-t-2 border-primary/50"></div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 border-r-2 border-t-2 border-primary/50"></div>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <div className="w-6 h-6 border-l-2 border-b-2 border-primary/50"></div>
                      </div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-6 h-6 border-r-2 border-b-2 border-primary/50"></div>
                      </div>
                    </div>
                  )}

                  {/* Camera status overlay */}
                  {!cameraActive && (
                    <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                          <Camera className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{t('sticker_scanner.camera_starting')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('sticker_scanner.position_sticker')}
                          </p>
                        </div>
                        <Button onClick={startCamera} className="button-enhanced">
                          <Camera className="w-4 h-4 mr-2" />
                          {t('sticker_scanner.start_camera')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results and Actions */}
                <div className="p-6 border-t border-border">
                  <div className="space-y-4">
                    {/* Last Result Display */}
                    {lastResult && (
                      <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-success" />
                            <div>
                              <div className="font-medium">VIN: {lastResult.vin}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('sticker_scanner.template')}: {lastResult.template} •
                                {t('sticker_scanner.processing_time')}: {lastResult.processingTime}ms
                              </div>
                            </div>
                          </div>
                          <Badge variant="default" className="bg-success text-success-foreground">
                            {(lastResult.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Detection Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {detectedSticker ? (
                          <>
                            <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-success">
                              {t('sticker_scanner.sticker_detected')}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                            <span className="text-sm text-muted-foreground">
                              {t('sticker_scanner.looking_for_sticker')}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {t('sticker_scanner.optimized_for_dealership')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={captureAndProcessSticker}
                          disabled={!cameraActive || processing}
                          className="button-enhanced"
                        >
                          {processing ? (
                            <>
                              <Zap className="w-4 h-4 mr-2 animate-pulse" />
                              {t('sticker_scanner.processing')}
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              {t('sticker_scanner.scan_sticker')}
                            </>
                          )}
                        </Button>

                        {detectedSticker && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {t('sticker_scanner.ready_to_scan')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>
                          {t('common.close')}
                        </Button>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                      {t('sticker_scanner.supported_formats')}: BMW, Ford, Toyota, Honda, Nissan + {t('sticker_scanner.generic')}
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