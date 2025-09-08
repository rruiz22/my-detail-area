import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { useVinScanner } from '@/hooks/useVinScanner';
import { useTranslation } from 'react-i18next';

interface VinBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onVinDetected: (vin: string) => void;
}

export function VinBarcodeScanner({ open, onClose, onVinDetected }: VinBarcodeScannerProps) {
  const { t } = useTranslation();
  const { scanVin, loading, error } = useVinScanner();
  const [detectedVins, setDetectedVins] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setVideoReady(false);
    
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('Camera access granted, setting up video...');
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          setVideoReady(true);
          setCameraLoading(false);
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setCameraError(t('vinScanner.videoError', 'Error al cargar el video'));
          setCameraLoading(false);
          stopCamera();
        };
        
        // Timeout fallback
        setTimeout(() => {
          if (!videoReady && mediaStream.active) {
            console.log('Video timeout, assuming ready');
            setVideoReady(true);
            setCameraLoading(false);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError(t('vinScanner.permissionDenied', 'Permiso de cámara denegado'));
        } else if (err.name === 'NotFoundError') {
          setCameraError(t('vinScanner.noCamera', 'No se encontró cámara'));
        } else {
          setCameraError(t('vinScanner.cameraError', 'Error al acceder a la cámara'));
        }
      } else {
        setCameraError(t('vinScanner.cameraError', 'Error al acceder a la cámara'));
      }
    }
  }, [t, videoReady]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }
    
    setVideoReady(false);
    setCameraLoading(false);
    setCameraError(null);
  }, [stream]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !videoReady) {
      console.warn('Video not ready for capture');
      return;
    }

    try {
      console.log('Capturing image...');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      context.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          console.log('Image captured, scanning VIN...');
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          const vins = await scanVin(file);
          setDetectedVins(vins);
        }
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error('Capture error:', err);
      setCameraError(t('vinScanner.captureError', 'Error al capturar imagen'));
    }
  }, [scanVin, videoReady, t]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const vins = await scanVin(file);
      setDetectedVins(vins);
    }
  }, [scanVin]);

  const handleVinSelect = useCallback((vin: string) => {
    onVinDetected(vin);
    handleClose();
  }, [onVinDetected]);

  const handleClose = useCallback(() => {
    console.log('Closing scanner modal...');
    stopCamera();
    setDetectedVins([]);
    setCameraError(null);
    onClose();
  }, [stopCamera, onClose]);
  
  // Cleanup on unmount or when dialog closes
  useEffect(() => {
    if (!open) {
      stopCamera();
      setDetectedVins([]);
      setCameraError(null);
    }
  }, [open, stopCamera]);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('Component unmounting, cleaning up camera...');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('vinScanner.title', 'Escanear VIN')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(error || cameraError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || cameraError}</AlertDescription>
            </Alert>
          )}

          {detectedVins.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t('vinScanner.detected', 'VINs detectados:')}
              </p>
              {detectedVins.map((vin, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start font-mono"
                  onClick={() => handleVinSelect(vin)}
                >
                  {vin}
                </Button>
              ))}
            </div>
          )}

          {stream ? (
            <div className="space-y-4">
              {cameraLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {t('vinScanner.initializingCamera', 'Inicializando cámara...')}
                  </span>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full rounded-lg bg-muted transition-opacity ${
                  videoReady && !cameraLoading ? 'opacity-100' : 'opacity-50'
                }`}
                style={{ aspectRatio: '4/3' }}
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={captureImage}
                  disabled={loading || !videoReady || cameraLoading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {t('vinScanner.capture', 'Capturar')}
                </Button>
                <Button
                  variant="outline"
                  onClick={stopCamera}
                  disabled={cameraLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t('vinScanner.instruction', 'Inicia la cámara o sube una imagen del VIN')}
                </p>
                <div className="flex gap-2">
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    {t('vinScanner.startCamera', 'Iniciar Cámara')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('vinScanner.uploadImage', 'Subir Imagen')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}