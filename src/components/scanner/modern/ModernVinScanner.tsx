import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVinBarcodeScanner } from '@/hooks/useVinBarcodeScanner';
import { cn } from '@/lib/utils';
import { isValidVin } from '@/utils/vinValidation';
import { vinAutoCorrection } from '@/utils/vinAutoCorrection';
import { AlertCircle, Camera, CheckCircle2, RefreshCw, Target, Upload, X, Zap, ChevronLeft } from 'lucide-react';
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

  const { scanVin, loading, progress, error, lastScanResult, engineType } = useVinBarcodeScanner();

  useEffect(() => {
    if (lastScanResult?.confidence !== undefined) {
      setConfidence(Math.round(lastScanResult.confidence * 100));
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

      setMode('camera');
      streamRef.current = stream;

      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        console.log('📺 Assigning stream to video element');
        videoRef.current.srcObject = stream;

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
            setCameraActive(true);
            resolve();
          };

          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });

          setTimeout(() => {
            setCameraActive(true);
            resolve();
          }, 2000);
        });
      }
    } catch (err) {
      console.error('❌ Camera initialization error:', err);
      setStatus('error');
      setStatusMessage(t('modern_vin_scanner.camera_error', 'Failed to access camera. Please check permissions.'));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 Stopping camera track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, []);

  const processVinCandidates = useCallback((vins: string[]) => {
    console.log('Processing VIN candidates:', vins);

    if (vins.length === 0) {
      setStatus('no-vin');
      setStatusMessage(t('vin_scanner.barcode_not_detected', 'No VIN barcode detected. Ensure VIN barcode is visible and well-lit.'));
      return;
    }

    const validVins = vins.filter((vin) => isValidVin(vin));
    const corrector = vinAutoCorrection;

    if (validVins.length > 0) {
      setDetectedVin(validVins[0]);
      setStatus('success');
      setStatusMessage(t('modern_vin_scanner.status_success', 'VIN detected successfully!'));
    } else {
      const corrected = corrector.correctVin(vins[0]);
      if (isValidVin(corrected)) {
        setDetectedVin(corrected);
        setStatus('success');
        setStatusMessage(t('modern_vin_scanner.status_corrected', 'VIN detected (auto-corrected)'));
      } else {
        setDetectedVin(vins[0]);
        setStatus('error');
        setStatusMessage(t('modern_vin_scanner.vin_invalid', 'Invalid VIN detected. Please verify manually.'));
      }
    }
  }, [t]);

  const runScan = useCallback(async (source: File | Blob, context: 'camera' | 'upload') => {
    setStatus('processing');
    setStatusMessage(
      context === 'camera'
        ? t('vin_scanner.scanning_barcode', 'Scanning barcode...')
        : t('modern_vin_scanner.status_processing_upload', 'Processing uploaded file…')
    );

    const vins = await scanVin(source);
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

    const iconClass = 'h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0';
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
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 rounded-lg border border-border bg-muted/40 px-3 py-2.5 sm:px-4 sm:py-3 text-sm">
        <div className={cn('flex items-center gap-2', tone)}>
          {icon}
          <span className="text-xs sm:text-sm">{statusMessage}</span>
        </div>
        {status === 'no-vin' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatus('idle')}
            className="self-end sm:self-auto"
          >
            {t('modern_vin_scanner.action_retry', 'Try again')}
          </Button>
        )}
      </div>
    );
  };

  const renderModeSelector = () => (
    <div className="flex flex-col items-center justify-center py-4 sm:py-8 px-3 sm:px-4 space-y-6 sm:space-y-8">
      {/* Header with Icon */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
          <Target className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('modern_vin_scanner.dialog_title', 'VIN Scanner')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed px-2">
            {stickerMode
              ? t('modern_vin_scanner.sticker_hint', 'Aim the camera at the VIN sticker and hold steady for best results.')
              : t('modern_vin_scanner.barcode_hint', 'Position the VIN barcode within the camera frame for instant scanning.')}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-2.5 sm:space-y-3 px-2">
        <Button
          onClick={startCamera}
          size="lg"
          className="w-full h-14 sm:h-16 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
          disabled={loading}
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{t('modern_vin_scanner.scan_camera', 'Scan with Camera')}</span>
          </div>
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="lg"
          className="w-full h-14 sm:h-16 text-sm sm:text-base font-semibold border-2 hover:bg-accent/50 transition-all"
          disabled={loading}
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{t('modern_vin_scanner.upload_image', 'Upload Image')}</span>
          </div>
        </Button>
      </div>

      {/* Tips Section */}
      <div className="w-full max-w-md px-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-medium text-foreground mb-2">
            💡 {t('modern_vin_scanner.tips_title', 'Tips for best results:')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 sm:space-y-1.5 pl-1">
            <li>• {t('modern_vin_scanner.tip_lighting', 'Ensure good lighting on the VIN barcode')}</li>
            <li>• {t('modern_vin_scanner.tip_steady', 'Hold camera steady when capturing')}</li>
            <li>• {t('modern_vin_scanner.tip_focus', 'Keep barcode in focus and fully visible')}</li>
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
    <div className="relative space-y-3 sm:space-y-4">
      {/* Video Container - Responsive sizing */}
      <div className="relative bg-black rounded-lg sm:rounded-xl overflow-hidden border-2 border-border aspect-video sm:aspect-auto" style={{ minHeight: '280px', maxHeight: '70vh' }}>
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: 'block',
            backgroundColor: '#000'
          }}
        />

        {/* Loading Overlay */}
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center text-white space-y-2 sm:space-y-3 px-4">
              <div className="relative mx-auto w-12 h-12 sm:w-16 sm:h-16">
                <Camera className="w-12 h-12 sm:w-16 sm:h-16 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-medium">
                {t('modern_vin_scanner.initializing_camera', 'Initializing camera...')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('modern_vin_scanner.allow_camera_access', 'Please allow camera access')}
              </p>
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
            <div className="text-center text-white space-y-2 sm:space-y-3 px-4">
              <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mx-auto" />
              <p className="text-xs sm:text-sm font-medium">
                {t('vin_scanner.scanning_barcode', 'Scanning barcode...')}
              </p>
              {progress > 0 && progress < 100 && (
                <div className="w-48 sm:w-64 mx-auto">
                  <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-1">{Math.round(progress)}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile hint overlay */}
        {cameraActive && !isCapturing && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 sm:hidden">
            <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full">
              {t('modern_vin_scanner.align_vin_here', 'Align barcode within the guide')}
            </div>
          </div>
        )}
      </div>

      {/* Controls - Responsive layout */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 px-2 sm:px-0">
        <Button
          onClick={() => {
            stopCamera();
            setMode('select');
            setStatus('idle');
          }}
          variant="outline"
          size="lg"
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>

        <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
          {/* Confidence indicator - hide on small mobile */}
          {cameraActive && confidence !== null && confidence > 0 && (
            <div className="hidden xs:block">
              <VinConfidenceIndicator confidence={confidence} />
            </div>
          )}

          <Button
            onClick={captureImage}
            size="lg"
            disabled={!cameraActive || isCapturing || loading}
            className="bg-primary hover:bg-primary/90 flex-1 sm:min-w-[160px]"
          >
            {isCapturing || loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">
                  {t('modern_vin_scanner.status_scanning', 'Scanning...')}
                </span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base">
                  {t('modern_vin_scanner.capture', 'Capture VIN')}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {renderStatusBanner()}
    </div>
  );

  const renderReviewPane = () => (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-emerald-900 dark:text-emerald-100 mb-1">
              {t('modern_vin_scanner.status_success', 'VIN detected successfully!')}
            </p>
            <p className="font-mono text-base sm:text-lg tracking-widest text-foreground break-all">
              {detectedVin}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
          {confidence !== null && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{t('modern_vin_scanner.confidence_label', 'Confidence')}:</span>
              <Badge variant={confidence > 80 ? 'default' : 'secondary'} className="text-xs">
                {confidence}%
              </Badge>
            </div>
          )}
          {lastScanResult?.engine && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{t('modern_vin_scanner.scanned_with', 'Engine')}:</span>
              <Badge variant="outline" className="text-xs">
                {lastScanResult.engine === 'native' ? 'Native API' : 'ZXing'}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button className="flex-1 h-12" onClick={handleUseVin}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t('modern_vin_scanner.action_use_result', 'Use VIN')}
        </Button>
        <Button variant="outline" className="flex-1 h-12" onClick={() => setStatus('idle')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('modern_vin_scanner.action_retry', 'Scan Again')}
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
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl font-bold flex flex-col xs:flex-row items-start xs:items-center gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span>{t('modern_vin_scanner.dialog_title', 'VIN Scanner')}</span>
            </div>
            <Badge variant="secondary" className="text-xs ml-0 xs:ml-auto">
              {engineType === 'native' ? (
                <><Zap className="w-3 h-3 mr-1" />{t('vin_scanner.engine_native', 'Native API')}</>
              ) : (
                <>{t('vin_scanner.engine_zxing', 'ZXing Scanner')}</>
              )}
            </Badge>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('modern_vin_scanner.dialog_subtitle', 'Scan vehicle VIN barcodes using the camera or upload an image for instant recognition.')}
          </p>
        </DialogHeader>

        <div className="mt-2">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
