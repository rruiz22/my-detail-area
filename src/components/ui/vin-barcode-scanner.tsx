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

  const cleanupCamera = useCallback(() => {
    console.log('Cleaning up camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }
    
    setStream(null);
    setVideoReady(false);
    setCameraLoading(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    // Clear any previous state first
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setVideoReady(false);
    setCameraLoading(true);
    setCameraError(null);
    
    try {
      console.log('Requesting camera access...');
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, setting up video...');
      
      // Check if component is still mounted and modal is open
      if (!videoRef.current) {
        console.log('Video ref not available, stopping stream');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      setStream(mediaStream);
      const video = videoRef.current;
      video.srcObject = mediaStream;
      
      // Set up event handlers with proper cleanup
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded, video ready');
        setVideoReady(true);
        setCameraLoading(false);
      };
      
      const handleVideoError = (e: Event) => {
        console.error('Video error:', e);
        setCameraError(t('vinScanner.videoError', 'Error al cargar el video'));
        setCameraLoading(false);
        // Stop the stream on error
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('error', handleVideoError, { once: true });
      
      // Try to play the video
      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Video play started successfully');
        }
      } catch (playError) {
        console.warn('Video play failed:', playError);
        // Continue anyway, some browsers don't allow autoplay
      }
      
      // Fallback timeout in case metadata never loads
      const timeoutId = setTimeout(() => {
        console.log('Video timeout reached, checking stream status');
        if (mediaStream.active) {
          console.log('Stream is active, forcing ready state');
          setVideoReady(true);
          setCameraLoading(false);
        } else {
          console.log('Stream is not active, showing error');
          setCameraError(t('vinScanner.cameraError', 'Error al acceder a la cámara'));
          setCameraLoading(false);
        }
      }, 5000);
      
      // Clear timeout if video loads properly
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(timeoutId);
      }, { once: true });
      
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            setCameraError(t('vinScanner.permissionDenied', 'Permiso de cámara denegado'));
            break;
          case 'NotFoundError':
            setCameraError(t('vinScanner.noCamera', 'No se encontró cámara'));
            break;
          case 'NotReadableError':
            setCameraError(t('vinScanner.cameraInUse', 'Cámara en uso por otra aplicación'));
            break;
          default:
            setCameraError(t('vinScanner.cameraError', 'Error al acceder a la cámara'));
        }
      } else {
        setCameraError(t('vinScanner.cameraError', 'Error al acceder a la cámara'));
      }
    }
  }, [t, stream]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !videoReady || !stream) {
      console.warn('Video not ready for capture');
      return;
    }

    try {
      console.log('Capturing image...');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0);

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
  }, [scanVin, videoReady, stream, t]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const vins = await scanVin(file);
      setDetectedVins(vins);
    }
  }, [scanVin]);

  const handleVinSelect = useCallback((vin: string) => {
    onVinDetected(vin);
    onClose();
  }, [onVinDetected, onClose]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open && stream) {
      console.log('Modal closed, cleaning up camera...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setVideoReady(false);
      setCameraLoading(false);
      setDetectedVins([]);
      setCameraError(null);
    }
  }, [open, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('Component unmounting, cleaning up camera...');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="vin-scanner-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('vinScanner.title', 'Escanear VIN')}
          </DialogTitle>
        </DialogHeader>
        
        <div id="vin-scanner-description" className="sr-only">
          {t('vinScanner.instruction', 'Inicia la cámara o sube una imagen del VIN')}
        </div>

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
                  <span className="ml-2">
                    {t('vinScanner.capture', 'Capturar')}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (stream) {
                      stream.getTracks().forEach(track => track.stop());
                      setStream(null);
                      setVideoReady(false);
                      setCameraLoading(false);
                    }
                  }}
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
                  <Button 
                    onClick={startCamera} 
                    className="flex-1"
                    disabled={cameraLoading}
                  >
                    {cameraLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
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