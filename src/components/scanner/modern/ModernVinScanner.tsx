import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Zap, Target } from 'lucide-react';
import { ScannerOverlay } from './ScannerOverlay';
import { VinTargetingGuides } from './VinTargetingGuides';
import { VinConfidenceIndicator } from './VinConfidenceIndicator';
import { VinStickerDetector } from './VinStickerDetector';
import { useVinScanner } from '@/hooks/useVinScanner';
import { cn } from '@/lib/utils';

interface ModernVinScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string) => void;
}

export function ModernVinScanner({
  open,
  onClose,
  onVinDetected
}: ModernVinScannerProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { scanVin, loading, error } = useVinScanner();

  // Camera controls
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
        setCameraActive(true);
        setMode('camera');
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Image capture and processing
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !cameraActive) return;

    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          const vins = await scanVin(blob, { enableLogging: true });

          if (vins.length > 0) {
            const detectedVin = vins[0]; // Take first valid VIN
            onVinDetected(detectedVin);
            onClose();
          }
        } catch (error) {
          console.error('Camera scan error:', error);
        }
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.8);
  }, [cameraActive, scanVin, onVinDetected, onClose]);

  // File upload handling
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const vins = await scanVin(file, { enableLogging: true });

      if (vins.length > 0) {
        const detectedVin = vins[0]; // Take first valid VIN
        onVinDetected(detectedVin);
        onClose();
      }
    } catch (error) {
      console.error('VIN scan error:', error);
    }
  }, [scanVin, onVinDetected, onClose]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('select');
      setConfidence(0);
    }
  }, [open, stopCamera]);

  const renderModeSelector = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      {/* Hero section */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
          <Target className="w-10 h-10 text-primary-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground">
          {t('modern_vin_scanner.title')}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t('modern_vin_scanner.subtitle')}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          onClick={startCamera}
          size="lg"
          className="flex-1 h-14 button-enhanced"
          disabled={loading}
        >
          <Camera className="w-5 h-5 mr-3" />
          {t('modern_vin_scanner.scan_camera')}
        </Button>
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="lg"
          className="flex-1 h-14 button-enhanced"
          disabled={loading}
        >
          <Upload className="w-5 h-5 mr-3" />
          {t('modern_vin_scanner.upload_image')}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );

  const renderCameraView = () => (
    <div className="relative">
      {/* Video feed */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />
        
        {/* Scanner overlay */}
        <ScannerOverlay 
          isActive={cameraActive && !isCapturing}
          confidence={confidence}
        />
        
        {/* Targeting guides */}
        <VinTargetingGuides 
          isActive={cameraActive && !isCapturing}
          confidence={confidence}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-6">
        <Button
          onClick={() => {
            stopCamera();
            setMode('select');
          }}
          variant="ghost"
          className="button-enhanced"
        >
          <X className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="flex items-center space-x-4">
          {/* Confidence indicator */}
          <VinConfidenceIndicator confidence={confidence} />
          
          {/* Capture button */}
          <Button
            onClick={captureImage}
            size="lg"
            disabled={!cameraActive || isCapturing || loading}
            className={cn(
              "px-8 h-12 button-enhanced relative",
              confidence > 0.8 && "bg-success hover:bg-success/90"
            )}
          >
            {isCapturing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                {t('modern_vin_scanner.processing')}
              </div>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                {t('modern_vin_scanner.capture')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] modal-enhanced p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Target className="w-6 h-6 mr-3 text-primary" />
            {t('modern_vin_scanner.dialog_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Main content */}
          {mode === 'select' && renderModeSelector()}
          {mode === 'camera' && renderCameraView()}
        </div>

        {/* VIN Sticker Detector for advanced processing */}
        <VinStickerDetector />
      </DialogContent>
    </Dialog>
  );
}