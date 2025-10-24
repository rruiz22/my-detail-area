import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useStockManagement } from '@/hooks/useStockManagement';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Database,
    Key,
    Link,
    RefreshCw,
    Save,
    Settings,
    TestTube2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DMSConfig {
  dms_provider: string;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at?: string;
  sync_settings: {
    api_endpoint?: string;
    api_key?: string;
    dealer_code?: string;
    sync_fields?: string[];
    filters?: {
      include_sold?: boolean;
      min_price?: number;
      max_age_days?: number;
    };
  };
}

interface StockDMSConfigProps {
  dealerId?: number;
}

export const StockDMSConfig: React.FC<StockDMSConfigProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { loading: stockLoading } = useStockManagement();
  const { hasModulePermission } = usePermissions();

  const canAdmin = hasModulePermission('stock', 'admin');

  // Default config for new dealers
  const defaultConfig: DMSConfig = {
    dms_provider: 'none',
    auto_sync_enabled: false,
    sync_frequency: 'manual',
    sync_settings: {
      sync_fields: ['stock_number', 'vin', 'make', 'model', 'year', 'price', 'mileage'],
      filters: {
        include_sold: false,
        max_age_days: 365
      }
    }
  };

  const [config, setConfig] = useState<DMSConfig>(defaultConfig);
  const [configLoading, setConfigLoading] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch DMS config from database
  useEffect(() => {
    const fetchDMSConfig = async () => {
      if (!dealerId || !canAdmin) {
        setConfigLoading(false);
        return;
      }

      try {
        setConfigLoading(true);
        const { data, error } = await supabase
          .from('dealer_dms_config')
          .select('*')
          .eq('dealer_id', dealerId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching DMS config:', error);
          setConfig(defaultConfig);
        } else if (data) {
          setConfigId(data.id);
          setConfig({
            dms_provider: data.dms_provider,
            auto_sync_enabled: data.auto_sync_enabled,
            sync_frequency: data.sync_frequency,
            last_sync_at: data.last_sync_at,
            sync_settings: data.sync_settings as DMSConfig['sync_settings']
          });
        } else {
          // No config exists yet
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error fetching DMS config:', error);
        setConfig(defaultConfig);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchDMSConfig();
  }, [dealerId, canAdmin]);

  const handleSave = async () => {
    if (!dealerId || !canAdmin) {
      toast({
        title: t('common.error'),
        description: t('errors.no_permission_admin'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const configData = {
        dealer_id: dealerId,
        dms_provider: config.dms_provider,
        auto_sync_enabled: config.auto_sync_enabled,
        sync_frequency: config.sync_frequency,
        sync_settings: config.sync_settings,
        updated_at: new Date().toISOString()
      };

      if (configId) {
        // Update existing config
        const { error } = await supabase
          .from('dealer_dms_config')
          .update(configData)
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('dealer_dms_config')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      toast({
        title: t('common.success'),
        description: t('stock.dms.config_saved_message', 'DMS configuration saved successfully'),
      });
    } catch (error) {
      console.error('Error saving DMS config:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('stock.dms.config_error_message', 'Failed to save configuration'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Mock test - would call actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResult({ success: true, message: 'Connection successful' });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const dmsProviders = [
    { value: 'none', label: t('stock.dms.provider_none', 'None (Manual Upload)') },
    { value: 'max_inventory', label: 'Max Inventory' },
    { value: 'cdk_global', label: 'CDK Global' },
    { value: 'dealertrack', label: 'DealerTrack' },
    { value: 'reynolds', label: 'Reynolds & Reynolds' },
    { value: 'automate', label: 'Automate' },
    { value: 'custom_api', label: 'Custom API' }
  ];

  const syncFrequencies = [
    { value: 'hourly', label: t('stock.dms.frequency.hourly') },
    { value: 'daily', label: t('stock.dms.frequency.daily') },
    { value: '12_hours', label: t('stock.dms.frequency.12_hours') },
    { value: 'weekly', label: t('stock.dms.frequency.weekly') },
    { value: 'manual', label: t('stock.dms.frequency.manual') }
  ];

  const availableFields = [
    'stock_number', 'vin', 'make', 'model', 'trim', 'year', 'mileage',
    'price', 'msrp', 'unit_cost', 'color', 'drivetrain', 'segment',
    'dms_status', 'lot_location', 'is_certified', 'certified_program'
  ];

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>{t('stock.dms.connection_status')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  config.auto_sync_enabled ? 'bg-success animate-pulse' : 'bg-muted'
                }`} />
                <span className="font-medium">
                  {config.auto_sync_enabled ? t('stock.dms.status.connected') : t('stock.dms.status.disconnected')}
                </span>
              </div>
              <Badge variant={config.auto_sync_enabled ? "default" : "secondary"}>
                {config.dms_provider}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!canAdmin || testing}
              title={!canAdmin ? t('errors.no_permission_admin') : ''}
            >
              <TestTube2 className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              {t('stock.dms.test_connection')}
            </Button>
          </div>

          {config.last_sync_at && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {t('stock.dms.last_sync')}: {new Date(config.last_sync_at).toLocaleString()}
              </span>
            </div>
          )}

          {testResult && (
            <Alert>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* DMS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>{t('stock.dms.configuration')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>{t('stock.dms.provider')}</Label>
            <Select
              value={config.dms_provider}
              onValueChange={(value) => setConfig(prev => ({ ...prev, dms_provider: value }))}
              disabled={!canAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dmsProviders.map(provider => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Connection Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Link className="w-5 h-5" />
              <span>{t('stock.dms.connection_settings')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('stock.dms.api_endpoint')}</Label>
                <Input
                  placeholder="https://api.example.com/v1"
                  value={config.sync_settings.api_endpoint || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    sync_settings: {
                      ...prev.sync_settings,
                      api_endpoint: e.target.value
                    }
                  }))}
                  disabled={!canAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('stock.dms.dealer_code')}</Label>
                <Input
                  placeholder="DEALER001"
                  value={config.sync_settings.dealer_code || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    sync_settings: {
                      ...prev.sync_settings,
                      dealer_code: e.target.value
                    }
                  }))}
                  disabled={!canAdmin}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Key className="w-4 h-4" />
                <span>{t('stock.dms.api_key')}</span>
              </Label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                value={config.sync_settings.api_key || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  sync_settings: {
                    ...prev.sync_settings,
                    api_key: e.target.value
                  }
                }))}
                disabled={!canAdmin}
              />
            </div>
          </div>

          <Separator />

          {/* Sync Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>{t('stock.dms.sync_settings')}</span>
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('stock.dms.auto_sync')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('stock.dms.auto_sync_description')}
                </p>
              </div>
              <Switch
                checked={config.auto_sync_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_sync_enabled: checked }))}
                disabled={!canAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('stock.dms.sync_frequency')}</Label>
              <Select
                value={config.sync_frequency}
                onValueChange={(value) => setConfig(prev => ({ ...prev, sync_frequency: value }))}
                disabled={!canAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncFrequencies.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Sync Filters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('stock.dms.sync_filters')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('stock.dms.include_sold')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('stock.dms.include_sold_description')}
                  </p>
                </div>
                <Switch
                  checked={config.sync_settings.filters?.include_sold || false}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    sync_settings: {
                      ...prev.sync_settings,
                      filters: {
                        ...prev.sync_settings.filters,
                        include_sold: checked
                      }
                    }
                  }))}
                  disabled={!canAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('stock.dms.max_age_days')}</Label>
                <Input
                  type="number"
                  placeholder="365"
                  value={config.sync_settings.filters?.max_age_days || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    sync_settings: {
                      ...prev.sync_settings,
                      filters: {
                        ...prev.sync_settings.filters,
                        max_age_days: parseInt(e.target.value) || undefined
                      }
                    }
                  }))}
                  disabled={!canAdmin}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={!canAdmin || saving || stockLoading}>
              <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              {saving ? t('common.saving', 'Saving...') : t('stock.dms.save_configuration', 'Save Configuration')}
            </Button>
          </div>

          {!canAdmin && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('errors.no_permission_admin_settings')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
