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
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [detectedVins, setDetectedVins] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
    setErrorMessage(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraLoading || cameraActive) return;
    
    console.log('🎬 Starting camera with direct approach...');
    setCameraLoading(true);
    setErrorMessage(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      console.log('✅ Camera stream acquired:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getVideoTracks().length
      });
      
      streamRef.current = stream;
      
      // First, set camera active to trigger render of video element
      console.log('🔄 Setting camera active to render video element...');
      setCameraActive(true);
      
      // Setup video after React renders the video element
      const setupVideoWithRetries = async () => {
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds total
        
        while (attempts < maxAttempts) {
          const video = videoRef.current;
          const container = containerRef.current;
          
          console.log(`🔧 Setup attempt ${attempts + 1}:`, {
            videoElement: !!video,
            container: !!container,
            streamActive: stream.active
          });
          
          if (video) {
            console.log('📺 Video element found! Setting up stream...');
            
            // Setup video
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            
            console.log('🎥 Stream assigned to video element');
            
            // Wait for video to be ready
            const waitForVideo = new Promise((resolve) => {
              const onReady = () => {
                console.log('✅ VIDEO READY!', {
                  width: video.videoWidth,
                  height: video.videoHeight,
                  readyState: video.readyState
                });
                setCameraLoading(false);
                resolve(true);
              };
              
              video.addEventListener('loadedmetadata', onReady, { once: true });
              video.addEventListener('playing', onReady, { once: true });
              
              // Also try immediate play
              video.play()
                .then(() => {
                  console.log('▶️ Video play successful');
                  onReady();
                })
                .catch((playErr) => {
                  console.warn('⚠️ Video play failed (but continuing):', playErr);
                  onReady();
                });
              
              // Safety timeout
              setTimeout(onReady, 1500);
            });
            
            await waitForVideo;
            return;
          }
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error('💥 Failed to find video element after', maxAttempts, 'attempts');
        setErrorMessage('Could not initialize video element');
        setCameraLoading(false);
      };
      
      // Start setup process
      setupVideoWithRetries();
      
    } catch (err: any) {
      console.error('💥 Camera setup failed:', err);
      setCameraLoading(false);
      
      if (err.name === 'NotAllowedError') {
        setErrorMessage(t('vinScanner.permissionDenied'));
      } else if (err.name === 'NotFoundError') {
        setErrorMessage(t('vinScanner.noCamera'));
      } else {
        setErrorMessage(t('vinScanner.cameraError'));
      }
    }
  }, [t, cameraLoading, cameraActive]);

  const captureImage = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraActive) {
      console.warn('📸 Cannot capture:', { video: !!video, active: cameraActive });
      return;
    }

    try {
      console.log('📸 Capturing from video:', video.videoWidth, 'x', video.videoHeight);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          console.log('🔍 Processing image for VIN...');
          const file = new File([blob], 'vin.jpg', { type: 'image/jpeg' });
          const vins = await scanVin(file);
          
          console.log('🎯 VIN scan result:', vins);
          setDetectedVins(vins);
          
          if (vins.length === 1) {
            onVinDetected(vins[0]);
            onClose();
          }
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('📸 Capture failed:', err);
      setErrorMessage(t('vinScanner.captureError'));
    }
  }, [scanVin, cameraActive, onVinDetected, onClose, t]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const vins = await scanVin(file);
    setDetectedVins(vins);
    
    if (vins.length === 1) {
      onVinDetected(vins[0]);
      onClose();
    }
  }, [scanVin, onVinDetected, onClose]);

  // Cleanup on dialog close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setDetectedVins([]);
      setErrorMessage(null);
    }
    return () => {
      stopCamera();
    };
  }, [open, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="vin-scanner-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('vinScanner.title')}
          </DialogTitle>
          <DialogDescription id="vin-scanner-desc">
            {t('vinScanner.instruction')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Alert */}
          {(error || errorMessage) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Detected VINs */}
          {detectedVins.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t('vinScanner.detected')} ({detectedVins.length})
              </p>
              {detectedVins.map((vin, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start font-mono text-sm"
                  onClick={() => onVinDetected(vin)}
                >
                  {vin}
                </Button>
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-4">
            {cameraActive ? (
              // Camera Active View
              <div className="space-y-3">
                <div 
                  ref={containerRef}
                  className="relative bg-gray-900 rounded-lg overflow-hidden border"
                  style={{ aspectRatio: '4/3', minHeight: '200px' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ 
                      display: 'block',
                      width: '100%',
                      height: '100%'
                    }}
                    onLoadedMetadata={() => console.log('📺 Video metadata loaded')}
                    onCanPlay={() => console.log('🎯 Video can play')}
                    onPlaying={() => console.log('▶️ Video is playing')}
                    onError={(e) => console.error('💥 Video element error:', e)}
                  />
                  
                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">{t('vinScanner.initializingCamera')}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={captureImage}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        {t('vinScanner.capture')}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={stopCamera} size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              // Start Screen
              <div className="text-center py-8">
                <div className="relative">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  {cameraLoading ? 'Starting camera...' : t('vinScanner.instruction')}
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={startCamera} 
                    disabled={cameraLoading}
                    className="w-full"
                    size="lg"
                  >
                    {cameraLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        {t('vinScanner.startCamera')}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('vinScanner.uploadImage')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            capture="environment"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}