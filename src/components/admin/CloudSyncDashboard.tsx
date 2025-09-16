import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Shield, 
  Database, 
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Trash2,
  Settings
} from 'lucide-react';
import { useCloudSyncStatus, useSessionRecovery } from '@/hooks/useCloudSync';
import { storage } from '@/lib/localStorage';
import { sessionRecovery } from '@/lib/sessionRecovery';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CloudSyncDashboardProps {
  className?: string;
}

export function CloudSyncDashboard({ className }: CloudSyncDashboardProps) {
  const { t } = useTranslation();
  const { isOnline, syncStatuses, forceSyncAll } = useCloudSyncStatus();
  const { isRecovering, recoveryAvailable, recoverSession } = useSessionRecovery();
  
  const [autoSync, setAutoSync] = useState(true);
  const [syncStats, setSyncStats] = useState({
    totalItems: 0,
    syncedItems: 0,
    pendingItems: 0,
    errorItems: 0
  });
  const [storageInfo, setStorageInfo] = useState(storage.getStorageInfo());

  useEffect(() => {
    updateSyncStats();
    const interval = setInterval(updateSyncStats, 5000);
    return () => clearInterval(interval);
  }, [syncStatuses, updateSyncStats]);

  const updateSyncStats = useCallback(() => {
    const stats = {
      totalItems: syncStatuses.size,
      syncedItems: Array.from(syncStatuses.values()).filter(s => s.status === 'synced').length,
      pendingItems: Array.from(syncStatuses.values()).filter(s => s.status === 'pending').length,
      errorItems: Array.from(syncStatuses.values()).filter(s => s.status === 'error').length
    };
    setSyncStats(stats);
    setStorageInfo(storage.getStorageInfo());
  }, [syncStatuses]);

  const handleForceSyncAll = async () => {
    try {
      await forceSyncAll();
      toast.success('All data synced successfully');
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleClearCache = () => {
    try {
      storage.cleanup();
      toast.success('Cache cleared successfully');
      updateSyncStats();
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const handleRecoverSession = async () => {
    const success = await recoverSession();
    if (success) {
      updateSyncStats();
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      const success = await sessionRecovery.createSessionSnapshot();
      if (success) {
        toast.success('Session snapshot created');
      } else {
        toast.error('Failed to create snapshot');
      }
    } catch (error) {
      toast.error('Snapshot creation failed');
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const syncProgress = syncStats.totalItems > 0 
    ? (syncStats.syncedItems / syncStats.totalItems) * 100 
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-5 w-5 text-blue-500" />
            ) : (
              <CloudOff className="h-5 w-5 text-gray-400" />
            )}
            <h2 className="text-2xl font-semibold">Cloud Sync Dashboard</h2>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceSyncAll}
            disabled={!isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Sync All
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{syncStats.totalItems}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Synced</p>
                <p className="text-2xl font-bold text-green-600">{syncStats.syncedItems}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{syncStats.pendingItems}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{syncStats.errorItems}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sync Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Sync Status</span>
              <span>{Math.round(syncProgress)}% Complete</span>
            </div>
            <Progress value={syncProgress} className="w-full" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{syncStats.syncedItems} Synced</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>{syncStats.pendingItems} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{syncStats.errorItems} Errors</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Session Recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Recovery Available</p>
                <p className="text-sm text-muted-foreground">
                  {recoveryAvailable ? 'Session backup found in cloud' : 'No recovery data available'}
                </p>
              </div>
              <Badge variant={recoveryAvailable ? "default" : "secondary"}>
                {recoveryAvailable ? 'Available' : 'None'}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRecoverSession}
                disabled={!recoveryAvailable || isRecovering}
              >
                <Download className="h-4 w-4 mr-2" />
                {isRecovering ? 'Recovering...' : 'Restore Session'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCreateSnapshot}
              >
                <Upload className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Total Keys</p>
                <p className="text-muted-foreground">{storageInfo.keys}</p>
              </div>
              <div>
                <p className="font-medium">Storage Size</p>
                <p className="text-muted-foreground">{storageInfo.totalSizeKB} KB</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearCache}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-sync">Automatic Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync changes to cloud
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status Details */}
      {syncStatuses.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Status Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Array.from(syncStatuses.entries()).map(([key, status]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    {getSyncStatusIcon(status.status)}
                    <span className="font-mono text-sm">{key}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {status.lastSync && (
                      <span>
                        {new Date(status.lastSync).toLocaleTimeString()}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {status.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}