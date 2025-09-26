import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Zap, Target, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScannerOverlay } from './ScannerOverlay';
import { VinTargetingGuides } from './VinTargetingGuides';
import { VinConfidenceIndicator } from './VinConfidenceIndicator';
import { useVinScanner } from '@/hooks/useVinScanner';
import { cn } from '@/lib/utils';

interface ModernVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string) => void;
  stickerMode?: boolean;
}

type ScannerStatus = 'idle' | 'processing' | 'success' | 'no-vin' | 'error';

const transliterationMap: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2,
  T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9
};

const positionWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const isVinValid = (vin: string) => {
  if (vin.length !== 17) return false;
  let sum = 0;
  for (let i = 0; i < vin.length; i++) {
    const value = transliterationMap[vin[i]];
    if (value === undefined) return false;
    sum += value * positionWeights[i];
  }
  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 'X' : remainder.toString();
  return vin[8] === checkDigit;
};

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('VIN scanner video play blocked:', playError);
        }
        setCameraActive(true);
        setMode('camera');
        setStatus('idle');
        setStatusMessage(t('modern_vin_scanner.status_ready', 'Ready to scan'));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setStatus('error');
      setStatusMessage(t('modern_vin_scanner.camera_unavailable', 'Unable to access camera. Check browser permissions.'));
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

    const validVin = vins.find(isVinValid);

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
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground">
          {t('modern_vin_scanner.dialog_title', 'VIN Scanner')}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {stickerMode
            ? t('modern_vin_scanner.sticker_hint', 'Aim the camera at the VIN sticker and hold steady.')
            : t('modern_vin_scanner.plate_hint', 'Aim the camera so the VIN plate fills the guide.')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          onClick={startCamera}
          size="lg"
          className="flex-1 h-14"
          disabled={loading}
        >
          <Camera className="w-5 h-5 mr-3" />
          {t('modern_vin_scanner.scan_camera', 'Scan with camera')}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="lg"
          className="flex-1 h-14"
          disabled={loading}
        >
          <Upload className="w-5 h-5 mr-3" />
          {t('modern_vin_scanner.upload_image', 'Upload image')}
        </Button>
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
    <div className="relative">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />

        <ScannerOverlay 
          isActive={cameraActive && !isCapturing}
          confidence={confidence ?? 0}
        />

        <VinTargetingGuides 
          isActive={cameraActive && !isCapturing}
          confidence={confidence ?? 0}
        />
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          onClick={() => {
            stopCamera();
            setMode('select');
            setStatus('idle');
          }}
          variant="ghost"
        >
          <X className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="flex items-center space-x-4">
          <VinConfidenceIndicator confidence={confidence ?? 0} />
          <Button
            onClick={captureImage}
            size="lg"
            disabled={!cameraActive || isCapturing || loading}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isCapturing ? t('modern_vin_scanner.status_scanning', 'Processing image…') : t('modern_vin_scanner.scan_camera', 'Scan with camera')}
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('modern_vin_scanner.dialog_title', 'VIN Scanner')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('modern_vin_scanner.dialog_subtitle', 'Scan vehicle VINs using the camera or upload an image.')}
          </p>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
