import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Camera, CheckCircle, XCircle, RotateCcw, Target } from 'lucide-react';
import { useAdvancedVinScanner } from '@/hooks/useAdvancedVinScanner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickScanModeProps {
  className?: string;
  onVinDetected?: (vin: string, confidence: number) => void;
  autoScanInterval?: number; // Auto-scan every X seconds
}

export function QuickScanMode({ 
  className, 
  onVinDetected,
  autoScanInterval = 2000 
}: QuickScanModeProps) {
  const { t } = useTranslation();
  const { scanVin, loading } = useAdvancedVinScanner();
  const [isActive, setIsActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastResult, setLastResult] = useState<{
    vin: string;
    confidence: number;
    timestamp: Date;
    status: 'success' | 'failed';
  } | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Start camera and auto-scanning
  const startQuickScan = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setIsActive(true);
        setScanCount(0);
        
        // Start auto-scanning
        scanIntervalRef.current = setInterval(() => {
          const now = Date.now();
          if (now - lastScanTimeRef.current >= autoScanInterval) {
            captureAndScan();
            lastScanTimeRef.current = now;
          }
        }, 500); // Check every 500ms, but scan based on interval
      }
    } catch (err) {
      console.error('Quick scan camera access error:', err);
    }
  }, [autoScanInterval, captureAndScan]);

  // Stop camera and scanning
  const stopQuickScan = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setCameraActive(false);
    setIsActive(false);
    setConfidence(0);
  }, []);

  // Capture and scan VIN
  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !cameraActive || loading) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        setScanCount(prev => prev + 1);
        
        try {
          const results = await scanVin(blob, (conf) => setConfidence(conf));
          
          if (results.length > 0) {
            const bestResult = results.reduce((prev, current) => 
              prev.confidence > current.confidence ? prev : current
            );
            
            const result = {
              vin: bestResult.vin,
              confidence: bestResult.confidence,
              timestamp: new Date(),
              status: bestResult.confidence > 0.8 ? 'success' as const : 'failed' as const
            };
            
            setLastResult(result);
            
            // If confidence is high enough, call the callback
            if (bestResult.confidence > 0.85) {
              onVinDetected?.(bestResult.vin, bestResult.confidence);
              
              // Store in history
              const historyEntry = {
                vin: bestResult.vin,
                status: 'success' as const,
                confidence: bestResult.confidence,
                processingTime: 1500, // Approximate for quick mode
                source: bestResult.source,
                imageName: 'quick-scan-capture.jpg'
              };
              
              // Add to localStorage history
              const storedHistory = localStorage.getItem('vinScannerHistory') || '[]';
              const history = JSON.parse(storedHistory);
              const newEntry = {
                ...historyEntry,
                id: Date.now().toString(),
                timestamp: new Date().toISOString()
              };
              history.unshift(newEntry);
              localStorage.setItem('vinScannerHistory', JSON.stringify(history.slice(0, 100))); // Keep last 100
            }
          }
        } catch (error) {
          console.error('Quick scan error:', error);
          setLastResult({
            vin: '',
            confidence: 0,
            timestamp: new Date(),
            status: 'failed'
          });
        }
      }
    }, 'image/jpeg', 0.8);
  }, [cameraActive, loading, scanVin, onVinDetected]);

  const toggleQuickScan = () => {
    if (isActive) {
      stopQuickScan();
    } else {
      startQuickScan();
    }
  };

  const resetScan = () => {
    setLastResult(null);
    setConfidence(0);
    setScanCount(0);
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t('quick_scan.title')}</h3>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className="flex items-center gap-1">
            <div className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            {isActive ? t('quick_scan.active') : t('quick_scan.inactive')}
          </Badge>
        </div>

        {/* Camera Feed */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Overlay */}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Scanning Frame */}
              <div className="relative">
                <div className={cn(
                  "w-48 h-12 border-2 border-dashed transition-all duration-300",
                  confidence > 0.8 ? "border-green-400" : "border-white"
                )}>
                  {/* Corner indicators */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-white" />
                </div>
                
                {/* Confidence indicator */}
                {confidence > 0 && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                      <span className="text-white text-xs">
                        {(confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Placeholder when camera is off */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
              <Camera className="w-12 h-12 mb-2" />
              <p className="text-sm">{t('quick_scan.camera_placeholder')}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">{t('quick_scan.scans')}</p>
            <p className="font-semibold">{scanCount}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">{t('quick_scan.confidence')}</p>
            <p className="font-semibold">{(confidence * 100).toFixed(0)}%</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">{t('quick_scan.interval')}</p>
            <p className="font-semibold">{autoScanInterval / 1000}s</p>
          </div>
        </div>

        {/* Last Result */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-3 rounded-lg border",
                lastResult.status === 'success' 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastResult.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {lastResult.status === 'success' 
                      ? t('quick_scan.vin_detected') 
                      : t('quick_scan.no_vin_detected')
                    }
                  </span>
                </div>
                <Button
                  onClick={resetScan}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              
              {lastResult.vin && (
                <div className="mt-2">
                  <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                    {lastResult.vin}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('quick_scan.confidence')}: {(lastResult.confidence * 100).toFixed(1)}% • 
                    {lastResult.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={toggleQuickScan}
            className="flex-1"
            variant={isActive ? "destructive" : "default"}
            disabled={loading}
          >
            <Target className="w-4 h-4 mr-2" />
            {isActive ? t('quick_scan.stop') : t('quick_scan.start')}
          </Button>
          
          {isActive && (
            <Button
              onClick={captureAndScan}
              variant="outline"
              disabled={loading || !cameraActive}
              className="px-3"
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          {t('quick_scan.instructions')}
        </p>
      </CardContent>
    </Card>
  );
}