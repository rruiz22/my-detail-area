import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVinScanner } from '@/hooks/useVinScanner';
import { cn } from '@/lib/utils';
import { isValidVin } from '@/utils/vinValidation';
import { AlertCircle, Camera, CheckCircle2, RefreshCw, Target, Upload, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScannerOverlay } from './ScannerOverlay';
import { VinConfidenceIndicator } from './VinConfidenceIndicator';
import { VinTargetingGuides } from './VinTargetingGuides';

interface ModernVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string) => void;
  stickerMode?: boolean;
}

type ScannerStatus = 'idle' | 'processing' | 'success' | 'no-vin' | 'error';

const preprocessImageBlob = async (blob: Blob): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple grayscale + contrast enhancement
    const contrast = 35; // percentage
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrasted = factor * (gray - 128) + 128;
      const clamped = Math.max(0, Math.min(255, contrasted));
      data[i] = data[i + 1] = data[i + 2] = clamped;
    }

    ctx.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((processed) => resolve(processed ?? blob), 'image/png', 1);
    });
  } catch (error) {
    console.warn('VIN preprocessing failed, using original image.', error);
    return blob;
  }
};

export function ModernVinScanner({
  open,
  onClose,
  onVinDetected,
  stickerMode = false
}: ModernVinScannerProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedVin, setDetectedVin] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { scanVin, loading, error, lastScanResult } = useVinScanner();

  useEffect(() => {
    if (lastScanResult?.confidence !== undefined) {
      setConfidence(Math.round(lastScanResult.confidence));
    }
  }, [lastScanResult?.confidence]);

  useEffect(() => {
    if (error) {
      setStatus('error');
      setStatusMessage(error);
    }
  }, [error]);

  const resetState = useCallback(() => {
    setMode('select');
    setCameraActive(false);
    setIsCapturing(false);
    setStatus('idle');
    setStatusMessage('');
    setDetectedVin(null);
    setConfidence(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      console.log('📹 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      console.log('✅ Camera stream obtained:', stream.id);

      // Set mode and stream first to ensure video element is rendered
      setMode('camera');
      streamRef.current = stream;

      // Wait for next frame to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        console.log('📺 Assigning stream to video element');
        videoRef.current.srcObject = stream;

        // Wait for video metadata to load
        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve();
            return;
          }

          const onLoadedMetadata = () => {
            console.log('✅ Video metadata loaded:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            resolve();
          };

          if (videoRef.current.readyState >= 1) {
            onLoadedMetadata();
          } else {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          }

          // Timeout fallback
          setTimeout(resolve, 2000);
        });

        // Play video
        try {
          await videoRef.current.play();
          console.log('▶️ Video playing');
        } catch (playError) {
          console.warn('⚠️ Video play blocked:', playError);
        }

        setCameraActive(true);
        setStatus('idle');
        setStatusMessage(t('modern_vin_scanner.status_ready', 'Ready to scan'));
      } else {
        console.error('❌ Video element not found');
        throw new Error('Video element not available');
      }
    } catch (err) {
      console.error('💥 Camera access error:', err);
      setStatus('error');
      setStatusMessage(t('modern_vin_scanner.camera_unavailable', 'Unable to access camera. Check browser permissions.'));

      // Cleanup stream if error occurred
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const processVinCandidates = useCallback((vins: string[]) => {
    if (vins.length === 0) {
      setStatus('no-vin');
      setStatusMessage(t('modern_vin_scanner.status_no_vin', 'No VIN found. Try adjusting the lighting or focus.'));
      return;
    }

    const validVin = vins.find(isValidVin);

    if (validVin) {
      setDetectedVin(validVin);
      setStatus('success');
      setStatusMessage(t('modern_vin_scanner.status_success', 'VIN detected.'));
    } else {
      setDetectedVin(null);
      setStatus('error');
      setStatusMessage(t('modern_vin_scanner.status_invalid', 'Scanned text is not a valid VIN. Please rescan.'));
    }
  }, [t]);

  const runScan = useCallback(async (source: Blob | File, context: 'camera' | 'upload') => {
    setStatus('processing');
    setStatusMessage(
      context === 'camera'
        ? t('modern_vin_scanner.status_scanning', 'Processing image…')
        : t('modern_vin_scanner.status_processing_upload', 'Processing uploaded file…')
    );

    const prepared = await preprocessImageBlob(source);
    const vins = await scanVin(prepared);
    processVinCandidates(vins);
  }, [processVinCandidates, scanVin, t]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !cameraActive) return;

    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      setIsCapturing(false);
      return;
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        await runScan(blob, 'camera');
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.85);
  }, [cameraActive, runScan]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await runScan(file, 'upload');
  }, [runScan]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
    }
  }, [open, resetState, stopCamera]);

  const handleUseVin = () => {
    if (!detectedVin) return;
    onVinDetected(detectedVin);
    onClose();
  };

  const renderStatusBanner = () => {
    if (status === 'idle') {
      return null;
    }

    const iconClass = 'h-4 w-4';
    let icon = <Zap className={iconClass} />;
    let tone = 'text-muted-foreground';

    if (status === 'success') {
      icon = <CheckCircle2 className={cn(iconClass, 'text-emerald-600')} />;
      tone = 'text-emerald-600';
    } else if (status === 'error') {
      icon = <AlertCircle className={cn(iconClass, 'text-destructive')} />;
      tone = 'text-destructive';
    } else if (status === 'no-vin') {
      icon = <AlertCircle className={cn(iconClass, 'text-amber-500')} />;
      tone = 'text-amber-600';
    } else if (status === 'processing') {
      icon = <RefreshCw className={cn(iconClass, 'animate-spin text-primary')} />;
      tone = 'text-primary';
    }

    return (
      <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2 text-sm">
        <div className={cn('flex items-center gap-2', tone)}>
          {icon}
          <span>{statusMessage}</span>
        </div>
        {status === 'no-vin' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatus('idle')}
          >
            {t('modern_vin_scanner.action_retry', 'Try again')}
          </Button>
        )}
      </div>
    );
  };

  const renderModeSelector = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-8">
      {/* Header with Icon */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
          <Target className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">
            {t('modern_vin_scanner.dialog_title', 'VIN Scanner')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {stickerMode
              ? t('modern_vin_scanner.sticker_hint', 'Aim the camera at the VIN sticker and hold steady for best results.')
              : t('modern_vin_scanner.plate_hint', 'Position the VIN plate within the camera frame and capture a clear image.')}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        <Button
          onClick={startCamera}
          size="lg"
          className="w-full h-16 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
          disabled={loading}
        >
          <div className="flex items-center justify-center gap-3">
            <Camera className="w-6 h-6" />
            <span>{t('modern_vin_scanner.scan_camera', 'Scan with Camera')}</span>
          </div>
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="lg"
          className="w-full h-16 text-base font-semibold border-2 hover:bg-accent/50 transition-all"
          disabled={loading}
        >
          <div className="flex items-center justify-center gap-3">
            <Upload className="w-6 h-6" />
            <span>{t('modern_vin_scanner.upload_image', 'Upload Image')}</span>
          </div>
        </Button>
      </div>

      {/* Tips Section */}
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-foreground mb-2">{t('modern_vin_scanner.tips_title', '💡 Tips for best results:')}</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• {t('modern_vin_scanner.tip_lighting', 'Ensure good lighting on the VIN plate')}</li>
            <li>• {t('modern_vin_scanner.tip_steady', 'Hold camera steady when capturing')}</li>
            <li>• {t('modern_vin_scanner.tip_focus', 'Keep VIN plate in focus and centered')}</li>
            <li>• {t('modern_vin_scanner.tip_glare', 'Avoid glare and reflections')}</li>
          </ul>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {renderStatusBanner()}
    </div>
  );

  const renderCameraView = () => (
    <div className="relative space-y-4">
      {/* Video Container with explicit sizing */}
      <div className="relative bg-black rounded-xl overflow-hidden border-2 border-border" style={{ minHeight: '400px', maxHeight: '600px' }}>
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: 'block',
            minHeight: '400px',
            maxHeight: '600px',
            backgroundColor: '#000'
          }}
          onLoadedMetadata={() => {
            console.log('📺 Video onLoadedMetadata event');
          }}
          onCanPlay={() => {
            console.log('✅ Video canPlay event');
          }}
          onPlay={() => {
            console.log('▶️ Video onPlay event');
          }}
        />

        {/* Loading Overlay when camera is initializing */}
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center text-white space-y-3">
              <div className="relative mx-auto w-16 h-16">
                <Camera className="w-16 h-16 animate-pulse" />
              </div>
              <p className="text-sm font-medium">{t('modern_vin_scanner.initializing_camera', 'Initializing camera...')}</p>
              <p className="text-xs text-muted-foreground">{t('modern_vin_scanner.allow_camera_access', 'Please allow camera access')}</p>
            </div>
          </div>
        )}

        {/* Scanner Overlays */}
        {cameraActive && (
          <>
            <ScannerOverlay
              isActive={!isCapturing}
              confidence={confidence ?? 0}
            />

            <VinTargetingGuides
              isActive={!isCapturing}
              confidence={confidence ?? 0}
            />
          </>
        )}

        {/* Scanning Overlay */}
        {isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center text-white space-y-3">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto" />
              <p className="text-sm font-medium">{t('modern_vin_scanner.scanning_vin', 'Scanning VIN...')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={() => {
            stopCamera();
            setMode('select');
            setStatus('idle');
          }}
          variant="outline"
          size="lg"
        >
          <X className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>

        <div className="flex items-center gap-3">
          {cameraActive && confidence !== null && confidence > 0 && (
            <VinConfidenceIndicator confidence={confidence} />
          )}

          <Button
            onClick={captureImage}
            size="lg"
            disabled={!cameraActive || isCapturing || loading}
            className="bg-primary hover:bg-primary/90 min-w-[160px]"
          >
            {isCapturing || loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('modern_vin_scanner.status_scanning', 'Scanning...')}
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                {t('modern_vin_scanner.capture', 'Capture VIN')}
              </>
            )}
          </Button>
        </div>
      </div>

      {renderStatusBanner()}
    </div>
  );

  const renderReviewPane = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">
          {t('modern_vin_scanner.status_success', 'VIN detected.')}
        </p>
        <p className="mt-2 font-mono text-lg tracking-widest text-foreground">
          {detectedVin}
        </p>
        {confidence !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('modern_vin_scanner.confidence_label', 'Confidence')}: {confidence}%
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={handleUseVin}>
          {t('modern_vin_scanner.action_use_result', 'Use VIN')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setStatus('idle')}>
          {t('modern_vin_scanner.action_retry', 'Try again')}
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (status === 'success' && detectedVin) {
      return renderReviewPane();
    }

    if (mode === 'camera') {
      return renderCameraView();
    }

    return renderModeSelector();
  };

  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {t('modern_vin_scanner.dialog_title', 'VIN Scanner')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('modern_vin_scanner.dialog_subtitle', 'Scan vehicle VINs using the camera or upload an image for instant recognition.')}
          </p>
        </DialogHeader>

        <div className="mt-2">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
