import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNFCManagement } from '../../hooks/useNFCManagement';
import { useWebNFC } from '../../hooks/useWebNFC';
import { NFCPhysicalWriter } from './NFCPhysicalWriter';
import { NFCPhysicalReader } from './NFCPhysicalReader';
import { 
  Smartphone, 
  Wifi, 
  Radio, 
  Zap,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit3,
  Activity,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NFCMobileDashboardProps {
  className?: string;
}

export function NFCMobileDashboard({ className }: NFCMobileDashboardProps) {
  const { t } = useTranslation();
  const { tags, loading, loadTags } = useNFCManagement();
  const { 
    isSupported, 
    isReading, 
    isWriting, 
    error, 
    lastRead, 
    startReading, 
    stopReading 
  } = useWebNFC();
  
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [isWriterOpen, setIsWriterOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [quickActions, setQuickActions] = useState(false);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const activeTags = tags?.filter(tag => tag.is_active) || [];
  const recentScans = tags?.filter(tag => tag.last_scanned_at).slice(0, 5) || [];

  const getConnectionStatus = () => {
    if (!isSupported) {
      return { status: 'unsupported', color: 'text-destructive', icon: AlertCircle };
    }
    if (isReading || isWriting) {
      return { status: 'active', color: 'text-success', icon: Zap };
    }
    return { status: 'ready', color: 'text-primary', icon: CheckCircle };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  const handleQuickScan = async () => {
    if (isReading) {
      stopReading();
    } else {
      setIsReaderOpen(true);
    }
  };

  const handleQuickWrite = (tag: any) => {
    setSelectedTag(tag);
    setIsWriterOpen(true);
  };

  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Mobile Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{t('nfc.mobile.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('nfc.mobile.subtitle')}
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full bg-muted",
                connectionStatus.color
              )}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">
                  {isSupported ? t('nfc.mobile.status.ready') : t('nfc.mobile.status.unsupported')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSupported 
                    ? t('nfc.mobile.status.ready_desc') 
                    : t('nfc.mobile.status.unsupported_desc')
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isSupported ? "bg-success" : "bg-destructive"
              )} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          size="lg" 
          className="h-20 flex-col gap-2"
          onClick={handleQuickScan}
          disabled={!isSupported}
        >
          <Eye className="h-6 w-6" />
          <span className="text-xs">
            {isReading ? t('nfc.reader.stop_scanning') : t('nfc.reader.start_scanning')}
          </span>
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="h-20 flex-col gap-2"
          onClick={() => setQuickActions(!quickActions)}
          disabled={!isSupported || activeTags.length === 0}
        >
          <Edit3 className="h-6 w-6" />
          <span className="text-xs">{t('nfc.mobile.quick_write')}</span>
        </Button>
      </div>

      {/* Last Read Tag */}
      {lastRead && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4 text-success" />
              {t('nfc.mobile.last_read')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('nfc.tag_info.name')}</span>
              <span className="text-sm font-medium">{lastRead.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('nfc.tag_info.type')}</span>
              <Badge variant="secondary" className="text-xs">
                {lastRead.type || 'general'}
              </Badge>
            </div>
            {lastRead.vehicleVin && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('nfc.tag_info.vin')}</span>
                <span className="text-xs font-mono">{lastRead.vehicleVin}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Write Tags */}
      {quickActions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('nfc.mobile.select_tag_to_write')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTags.slice(0, 5).map((tag) => (
              <div 
                key={tag.id}
                className="flex items-center justify-between p-2 rounded border hover:bg-muted cursor-pointer"
                onClick={() => handleQuickWrite(tag)}
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-32">{tag.name}</p>
                    <p className="text-xs text-muted-foreground">#{tag.tag_uid}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {tag.tag_type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('nfc.mobile.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentScans.length > 0 ? (
            recentScans.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm truncate max-w-32">{tag.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {tag.scan_count} {t('nfc.mobile.scans')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tag.last_scanned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('nfc.mobile.no_recent_activity')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-4 pb-2 text-center">
            <div className="text-lg font-bold">{activeTags.length}</div>
            <div className="text-xs text-muted-foreground">{t('nfc.mobile.active_tags')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2 text-center">
            <div className="text-lg font-bold">
              {tags?.reduce((sum, tag) => sum + tag.scan_count, 0) || 0}
            </div>
            <div className="text-xs text-muted-foreground">{t('nfc.mobile.total_scans')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2 text-center">
            <div className="text-lg font-bold flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              {recentScans.length}
            </div>
            <div className="text-xs text-muted-foreground">{t('nfc.mobile.recent')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NFC Writer Dialog */}
      {selectedTag && (
        <NFCPhysicalWriter
          isOpen={isWriterOpen}
          onClose={() => {
            setIsWriterOpen(false);
            setSelectedTag(null);
            setQuickActions(false);
          }}
          tag={selectedTag}
          onSuccess={() => {
            setQuickActions(false);
          }}
        />
      )}

      {/* NFC Reader Dialog */}
      <NFCPhysicalReader
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        onTagRead={(tagData) => {
          console.log('Tag read in mobile dashboard:', tagData);
        }}
      />
    </div>
  );
}