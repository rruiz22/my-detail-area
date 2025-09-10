import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { useWebNFC } from '../../hooks/useWebNFC';
import { 
  Smartphone, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Radio,
  Eye,
  EyeOff
} from 'lucide-react';

interface NFCPhysicalReaderProps {
  isOpen: boolean;
  onClose: () => void;
  onTagRead?: (tagData: any) => void;
}

export function NFCPhysicalReader({ isOpen, onClose, onTagRead }: NFCPhysicalReaderProps) {
  const { t } = useTranslation();
  const { 
    isSupported, 
    isReading, 
    error, 
    lastRead, 
    startReading, 
    stopReading, 
    requestPermissions 
  } = useWebNFC();
  
  const [readStatus, setReadStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedData, setScannedData] = useState<any>(null);

  useEffect(() => {
    if (lastRead) {
      setScannedData(lastRead);
      setReadStatus('success');
      onTagRead?.(lastRead);
    }
  }, [lastRead, onTagRead]);

  useEffect(() => {
    if (isReading) {
      setReadStatus('scanning');
    }
  }, [isReading]);

  useEffect(() => {
    if (error) {
      setReadStatus('error');
    }
  }, [error]);

  const handleStartScanning = async () => {
    setReadStatus('scanning');
    setScannedData(null);
    
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setReadStatus('error');
      return;
    }

    startReading();
  };

  const handleStopScanning = () => {
    stopReading();
    setReadStatus('idle');
  };

  const handleClose = () => {
    if (isReading) {
      stopReading();
    }
    setReadStatus('idle');
    setScannedData(null);
    onClose();
  };

  const getStatusIcon = () => {
    switch (readStatus) {
      case 'scanning':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-success" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-destructive" />;
      default:
        return <Radio className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (readStatus) {
      case 'scanning':
        return t('nfc.reader.scanning');
      case 'success':
        return t('nfc.reader.success');
      case 'error':
        return t('nfc.reader.error');
      default:
        return t('nfc.reader.ready');
    }
  };

  const getInstructionText = () => {
    switch (readStatus) {
      case 'scanning':
        return t('nfc.reader.instructions.scanning');
      case 'success':
        return t('nfc.reader.instructions.success');
      case 'error':
        return t('nfc.reader.instructions.error');
      default:
        return t('nfc.reader.instructions.ready');
    }
  };

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('nfc.reader.title')}
            </DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('nfc.errors.not_supported')}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('nfc.reader.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Read Status */}
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {getStatusText()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {getInstructionText()}
          </p>
        </div>

        {/* Animation for scanning state */}
        {readStatus === 'scanning' && (
          <div className="flex justify-center">
            <div className="relative">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div className="absolute -top-2 -right-2">
                <div className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-primary opacity-75"></div>
                <div className="relative inline-flex rounded-full h-4 w-4 bg-primary">
                  <Wifi className="h-3 w-3 text-white m-auto" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanned Data Display */}
        {scannedData && readStatus === 'success' && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                {t('nfc.reader.tag_data')}
              </h4>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('nfc.tag_info.id')}</span>
                <span className="font-mono text-xs">{scannedData.tagId}</span>
              </div>
              
              {scannedData.name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.name')}</span>
                  <span className="text-sm">{scannedData.name}</span>
                </div>
              )}
              
              {scannedData.type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.type')}</span>
                  <Badge variant="secondary">{scannedData.type}</Badge>
                </div>
              )}
              
              {scannedData.vehicleVin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.vin')}</span>
                  <span className="font-mono text-xs">{scannedData.vehicleVin}</span>
                </div>
              )}
              
              {scannedData.locationName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.location')}</span>
                  <span className="text-sm">{scannedData.locationName}</span>
                </div>
              )}
              
              {scannedData.url && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.url')}</span>
                  <span className="text-xs text-primary truncate max-w-40">{scannedData.url}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && readStatus === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            {t('common.close')}
          </Button>
          
          {readStatus === 'idle' && (
            <Button onClick={handleStartScanning}>
              <Eye className="h-4 w-4 mr-2" />
              {t('nfc.reader.start_scanning')}
            </Button>
          )}
          
          {readStatus === 'scanning' && (
            <Button variant="destructive" onClick={handleStopScanning}>
              <EyeOff className="h-4 w-4 mr-2" />
              {t('nfc.reader.stop_scanning')}
            </Button>
          )}
          
          {readStatus === 'success' && (
            <Button onClick={handleStartScanning}>
              {t('nfc.reader.scan_another')}
            </Button>
          )}
          
          {readStatus === 'error' && (
            <Button onClick={handleStartScanning}>
              {t('nfc.reader.retry')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}