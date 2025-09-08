import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        const vins = await scanVin(file);
        setDetectedVins(vins);
      }
    });
  }, [scanVin]);

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
    stopCamera();
    setDetectedVins([]);
    onClose();
  }, [stopCamera, onClose]);

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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-muted"
                style={{ aspectRatio: '4/3' }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={captureImage}
                  disabled={loading}
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