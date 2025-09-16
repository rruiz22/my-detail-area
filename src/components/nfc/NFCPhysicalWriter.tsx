import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { useWebNFC } from '../../hooks/useWebNFC';
import { NFCTag } from '../../hooks/useNFCManagement';
import { 
  Smartphone, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Radio
} from 'lucide-react';

interface NFCPhysicalWriterProps {
  isOpen: boolean;
  onClose: () => void;
  tag: NFCTag;
  onSuccess?: () => void;
}

export function NFCPhysicalWriter({ isOpen, onClose, tag, onSuccess }: NFCPhysicalWriterProps) {
  const { t } = useTranslation();
  const { isSupported, isWriting, error, writeTag, requestPermissions } = useWebNFC();
  const [writeStatus, setWriteStatus] = useState<'idle' | 'preparing' | 'writing' | 'success' | 'error'>('idle');
  const [writeError, setWriteError] = useState<string | null>(null);

  const handleWrite = async () => {
    setWriteStatus('preparing');
    setWriteError(null);

    // Request permissions first
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setWriteStatus('error');
      setWriteError(t('nfc.errors.permission_denied'));
      return;
    }

    setWriteStatus('writing');

    try {
      const nfcData = {
        tagId: tag.id,
        name: tag.name,
        type: tag.tag_type,
        dealerId: tag.dealer_id,
        vehicleVin: tag.vehicle_vin || undefined,
        locationName: tag.location_name || undefined
      };

      const success = await writeTag(nfcData);
      
      if (success) {
        setWriteStatus('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setWriteStatus('error');
        setWriteError(error || t('nfc.errors.write_failed'));
      }
    } catch (err: unknown) {
      console.error('Write error:', err);
      setWriteStatus('error');
      setWriteError(err instanceof Error ? err.message : t('nfc.errors.write_failed'));
    }
  };

  const handleClose = () => {
    if (writeStatus !== 'writing') {
      setWriteStatus('idle');
      setWriteError(null);
      onClose();
    }
  };

  const getStatusIcon = () => {
    switch (writeStatus) {
      case 'preparing':
      case 'writing':
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
    switch (writeStatus) {
      case 'preparing':
        return t('nfc.writer.preparing');
      case 'writing':
        return t('nfc.writer.writing');
      case 'success':
        return t('nfc.writer.success');
      case 'error':
        return t('nfc.writer.error');
      default:
        return t('nfc.writer.ready');
    }
  };

  const getInstructionText = () => {
    switch (writeStatus) {
      case 'preparing':
        return t('nfc.writer.instructions.preparing');
      case 'writing':
        return t('nfc.writer.instructions.writing');
      case 'success':
        return t('nfc.writer.instructions.success');
      case 'error':
        return t('nfc.writer.instructions.error');
      default:
        return t('nfc.writer.instructions.ready');
    }
  };

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('nfc.writer.title')}
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
            <Smartphone className="h-5 w-5" />
            {t('nfc.writer.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Tag Information */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('nfc.tag_info.name')}</span>
                <span className="font-medium">{tag.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('nfc.tag_info.type')}</span>
                <Badge variant="secondary">{tag.tag_type}</Badge>
              </div>
              {tag.vehicle_vin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.vin')}</span>
                  <span className="font-mono text-sm">{tag.vehicle_vin}</span>
                </div>
              )}
              {tag.location_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('nfc.tag_info.location')}</span>
                  <span className="text-sm">{tag.location_name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Write Status */}
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

        {/* Animation for writing state */}
        {(writeStatus === 'writing' || writeStatus === 'preparing') && (
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

        {/* Error Display */}
        {(writeError || error) && writeStatus === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {writeError || error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={writeStatus === 'writing' || writeStatus === 'preparing'}
          >
            {writeStatus === 'success' ? t('common.close') : t('common.cancel')}
          </Button>
          {writeStatus === 'idle' && (
            <Button onClick={handleWrite} disabled={isWriting}>
              <Radio className="h-4 w-4 mr-2" />
              {t('nfc.writer.write_tag')}
            </Button>
          )}
          {writeStatus === 'error' && (
            <Button onClick={handleWrite} disabled={isWriting}>
              {t('nfc.writer.retry')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}