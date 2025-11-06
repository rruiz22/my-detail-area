import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaxAutoSync } from '@/hooks/useMaxAutoSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Settings, PlayCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockAutoSyncConfigProps {
  dealerId: number;
}

export function StockAutoSyncConfig({ dealerId }: StockAutoSyncConfigProps) {
  const { t } = useTranslation();
  const {
    config,
    isLoading,
    error,
    saveConfig,
    isSaving,
    toggleAutoSync,
    isToggling,
    triggerSync,
    isSyncing
  } = useMaxAutoSync(dealerId);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    autoSyncEnabled: config?.auto_sync_enabled || false,
    syncFrequencyHours: config?.sync_frequency_hours || 12
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSaveConfig = () => {
    if (!formData.username || !formData.password) {
      return;
    }

    saveConfig({
      username: formData.username,
      password: formData.password,
      autoSyncEnabled: formData.autoSyncEnabled,
      syncFrequencyHours: formData.syncFrequencyHours as 6 | 12 | 24
    });
  };

  const handleToggleSync = () => {
    toggleAutoSync(!config?.auto_sync_enabled);
  };

  const handleManualSync = () => {
    if (!formData.username || !formData.password) {
      return;
    }

    triggerSync({
      username: formData.username,
      password: formData.password
    });
  };

  const getSyncStatusBadge = () => {
    if (!config?.last_sync_status) return null;

    const statusConfig = {
      success: {
        icon: CheckCircle2,
        variant: 'default' as const,
        className: 'bg-emerald-500 hover:bg-emerald-600',
        label: t('stock.auto_sync.status_success')
      },
      failed: {
        icon: XCircle,
        variant: 'destructive' as const,
        className: '',
        label: t('stock.auto_sync.status_failed')
      },
      in_progress: {
        icon: Loader2,
        variant: 'secondary' as const,
        className: 'bg-amber-500 hover:bg-amber-600',
        label: t('stock.auto_sync.status_in_progress')
      }
    };

    const status = statusConfig[config.last_sync_status];
    const Icon = status.icon;

    return (
      <Badge variant={status.variant} className={status.className}>
        <Icon className={cn("h-3 w-3 mr-1", config.last_sync_status === 'in_progress' && "animate-spin")} />
        {status.label}
      </Badge>
    );
  };

  const getLastSyncTime = () => {
    if (!config?.last_sync_at) return null;

    const date = new Date(config.last_sync_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = '';
    if (diffDays > 0) {
      timeAgo = t('stock.auto_sync.time_ago_days', { count: diffDays });
    } else if (diffHours > 0) {
      timeAgo = t('stock.auto_sync.time_ago_hours', { count: diffHours });
    } else if (diffMins > 0) {
      timeAgo = t('stock.auto_sync.time_ago_minutes', { count: diffMins });
    } else {
      timeAgo = t('stock.auto_sync.time_ago_just_now');
    }

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{t('stock.auto_sync.last_sync')}: {timeAgo}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>
          {t('stock.auto_sync.load_error')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('stock.auto_sync.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('stock.auto_sync.description')}</p>
        </div>
        {config && (
          <div className="flex items-center gap-4">
            {getSyncStatusBadge()}
            <Switch
              checked={config.auto_sync_enabled}
              onCheckedChange={handleToggleSync}
              disabled={isToggling}
            />
          </div>
        )}
      </div>

      {/* Last Sync Info */}
      {getLastSyncTime()}

      {/* Configuration Form */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('stock.auto_sync.configuration')}
          </CardTitle>
          <CardDescription>
            {t('stock.auto_sync.configuration_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max.Auto Credentials */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                {t('stock.auto_sync.username')}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="username"
                type="email"
                placeholder={t('stock.auto_sync.username_placeholder')}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                {t('stock.auto_sync.password')}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('stock.auto_sync.password_placeholder')}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? t('common.hide') : t('common.show')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('stock.auto_sync.credentials_encrypted')}
              </p>
            </div>
          </div>

          {/* Sync Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">
              {t('stock.auto_sync.sync_frequency')}
            </Label>
            <Select
              value={formData.syncFrequencyHours.toString()}
              onValueChange={(value) => setFormData({
                ...formData,
                syncFrequencyHours: parseInt(value) as 6 | 12 | 24
              })}
              disabled={isSaving}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">
                  {t('stock.auto_sync.frequency_6h')}
                </SelectItem>
                <SelectItem value="12">
                  {t('stock.auto_sync.frequency_12h')}
                </SelectItem>
                <SelectItem value="24">
                  {t('stock.auto_sync.frequency_24h')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enable Auto-Sync Checkbox */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-sync"
              checked={formData.autoSyncEnabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                autoSyncEnabled: checked
              })}
              disabled={isSaving}
            />
            <Label htmlFor="auto-sync" className="cursor-pointer">
              {t('stock.auto_sync.enable_auto_sync')}
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveConfig}
              disabled={isSaving || !formData.username || !formData.password}
              className="flex-1"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save_changes')}
            </Button>

            <Button
              variant="outline"
              onClick={handleManualSync}
              disabled={isSyncing || !formData.username || !formData.password}
              className="flex-1"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              {t('stock.auto_sync.sync_now')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert>
        <RefreshCw className="h-4 w-4" />
        <AlertTitle>{t('stock.auto_sync.info_title')}</AlertTitle>
        <AlertDescription>
          {t('stock.auto_sync.info_description')}
        </AlertDescription>
      </Alert>

      {/* Last Sync Details */}
      {config?.last_sync_details && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stock.auto_sync.last_sync_details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
              {JSON.stringify(config.last_sync_details, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
