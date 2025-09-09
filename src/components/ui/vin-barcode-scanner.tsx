import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  
  // Simple UI states
  const [detectedVins, setDetectedVins] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  // Stable references
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef(false);

  // Clean up camera function
  const cleanupCamera = useCallback(() => {
    console.log('Cleaning up camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }
    
    setVideoReady(false);
    setCameraLoading(false);
    isInitializingRef.current = false;
  }, []);

  const startCamera = useCallback(async () => {
    // Prevent multiple initializations
    if (isInitializingRef.current || streamRef.current) {
      console.log('Camera already initializing or active, skipping...');
      return;
    }

    isInitializingRef.current = true;
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
      streamRef.current = mediaStream;
      
      if (videoRef.current && mediaStream.active) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Wait for video to be ready
        const setupVideo = new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            console.log('Video metadata loaded - camera ready!');
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            setVideoReady(true);
            resolve();
          };
          
          if (video.readyState >= 2) {
            // Video is already loaded
            console.log('Video already loaded');
            setVideoReady(true);
            resolve();
          } else {
            video.addEventListener('loadedmetadata', onLoadedMetadata);
          }
          
          // Fallback timeout
          setTimeout(() => {
            console.log('Video setup timeout, forcing ready state');
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            setVideoReady(true);
            resolve();
          }, 2000);
        });
        
        // Try to play the video
        try {
          await video.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.warn('Video autoplay failed, but continuing:', playError);
        }
        
        await setupVideo;
        console.log('Camera initialization complete');
      }
    } catch (err) {
      console.error('Camera setup error:', err);
      cleanupCamera();
      
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
    } finally {
      setCameraLoading(false);
      isInitializingRef.current = false;
    }
  }, [t, cleanupCamera]);

  const stopCamera = useCallback(() => {
    console.log('Manually stopping camera...');
    cleanupCamera();
    setCameraError(null);
  }, [cleanupCamera]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !videoReady || !streamRef.current) {
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
    onClose();
  }, [onVinDetected, onClose]);

  const handleClose = useCallback(() => {
    console.log('Dialog closing, cleaning up...');
    cleanupCamera();
    setDetectedVins([]);
    setCameraError(null);
    onClose();
  }, [cleanupCamera, onClose]);

  // Single useEffect for dialog lifecycle management
  useEffect(() => {
    if (open) {
      console.log('Dialog opened');
      // Auto-start camera when dialog opens (optional)
      // startCamera();
    } else {
      console.log('Dialog closed, cleaning up...');
      cleanupCamera();
      setDetectedVins([]);
      setCameraError(null);
    }
    
    // Cleanup on unmount
    return () => {
      console.log('Component cleanup');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, cleanupCamera]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('vinScanner.title', 'Escanear VIN')}
          </DialogTitle>
          <DialogDescription>
            {t('vinScanner.instruction', 'Inicia la cámara o sube una imagen del VIN')}
          </DialogDescription>
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

          {streamRef.current ? (
            <div className="space-y-4">
              {cameraLoading && !videoReady && (
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
                className="w-full rounded-lg bg-muted"
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