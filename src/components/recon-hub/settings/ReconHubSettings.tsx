import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Bell, Clock, AlertTriangle, Palette, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ReconHubSettingsProps {
  dealerId: number;
}

interface SettingsConfig {
  notifications: {
    enableAlerts: boolean;
    criticalThreshold: number;
    highThreshold: number;
    mediumThreshold: number;
    alertMethods: string[];
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultView: string;
    showPredictiveAnalytics: boolean;
  };
  thresholds: {
    targetT2L: number;
    criticalT2L: number;
    maxHoldingCost: number;
    onTimeTarget: number;
  };
  workflow: {
    enableAutomaticStatusUpdates: boolean;
    requireApprovals: boolean;
    defaultPriority: string;
  };
}

export function ReconHubSettings({ dealerId }: ReconHubSettingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SettingsConfig>({
    notifications: {
      enableAlerts: true,
      criticalThreshold: 10,
      highThreshold: 7,
      mediumThreshold: 4,
      alertMethods: ['email', 'dashboard']
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      defaultView: 'overview',
      showPredictiveAnalytics: true
    },
    thresholds: {
      targetT2L: 4,
      criticalT2L: 10,
      maxHoldingCost: 500,
      onTimeTarget: 80
    },
    workflow: {
      enableAutomaticStatusUpdates: false,
      requireApprovals: true,
      defaultPriority: 'normal'
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t('reconHub.settings.saved', 'Settings Saved'),
        description: t('reconHub.settings.savedDesc', 'Your ReconHub settings have been updated successfully'),
      });
    } catch (error) {
      toast({
        title: t('reconHub.settings.error', 'Save Error'),
        description: t('reconHub.settings.errorDesc', 'Failed to save settings. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = <K extends keyof SettingsConfig>(
    category: K,
    key: keyof SettingsConfig[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('reconHub.settings.title', 'ReconHub Settings')}
          </CardTitle>
          <CardDescription>
            {t('reconHub.settings.description', 'Configure your ReconHub dashboard preferences and alert thresholds')}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('reconHub.settings.notifications', 'Notifications')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.settings.notificationsDesc', 'Configure alert thresholds and notification methods')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enableAlerts">
                {t('reconHub.settings.enableAlerts', 'Enable Alerts')}
              </Label>
              <Switch
                id="enableAlerts"
                checked={settings.notifications.enableAlerts}
                onCheckedChange={(checked) => updateSettings('notifications', 'enableAlerts', checked)}
              />
            </div>

            {settings.notifications.enableAlerts && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('reconHub.settings.criticalThreshold', 'Critical Alert (days)')}
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={[settings.notifications.criticalThreshold]}
                        onValueChange={([value]) => updateSettings('notifications', 'criticalThreshold', value)}
                        max={30}
                        min={5}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5 days</span>
                      <span className="font-medium">{settings.notifications.criticalThreshold} days</span>
                      <span>30 days</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('reconHub.settings.highThreshold', 'High Alert (days)')}
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={[settings.notifications.highThreshold]}
                        onValueChange={([value]) => updateSettings('notifications', 'highThreshold', value)}
                        max={settings.notifications.criticalThreshold - 1}
                        min={3}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>3 days</span>
                      <span className="font-medium">{settings.notifications.highThreshold} days</span>
                      <span>{settings.notifications.criticalThreshold - 1} days</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('reconHub.settings.mediumThreshold', 'Medium Alert (days)')}
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={[settings.notifications.mediumThreshold]}
                        onValueChange={([value]) => updateSettings('notifications', 'mediumThreshold', value)}
                        max={settings.notifications.highThreshold - 1}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 day</span>
                      <span className="font-medium">{settings.notifications.mediumThreshold} days</span>
                      <span>{settings.notifications.highThreshold - 1} days</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('reconHub.settings.dashboard', 'Dashboard')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.settings.dashboardDesc', 'Customize your dashboard experience and display preferences')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoRefresh">
                {t('reconHub.settings.autoRefresh', 'Auto Refresh')}
              </Label>
              <Switch
                id="autoRefresh"
                checked={settings.dashboard.autoRefresh}
                onCheckedChange={(checked) => updateSettings('dashboard', 'autoRefresh', checked)}
              />
            </div>

            {settings.dashboard.autoRefresh && (
              <div className="space-y-2">
                <Label htmlFor="refreshInterval">
                  {t('reconHub.settings.refreshInterval', 'Refresh Interval')}
                </Label>
                <Select
                  value={settings.dashboard.refreshInterval.toString()}
                  onValueChange={(value) => updateSettings('dashboard', 'refreshInterval', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="defaultView">
                {t('reconHub.settings.defaultView', 'Default View')}
              </Label>
              <Select
                value={settings.dashboard.defaultView}
                onValueChange={(value) => updateSettings('dashboard', 'defaultView', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">{t('reconHub.tabs.overview', 'Overview')}</SelectItem>
                  <SelectItem value="t2l">{t('reconHub.tabs.t2lMetrics', 'T2L Metrics')}</SelectItem>
                  <SelectItem value="alerts">{t('reconHub.tabs.alerts', 'Alerts')}</SelectItem>
                  <SelectItem value="workflow">{t('reconHub.tabs.workflow', 'Workflow')}</SelectItem>
                  <SelectItem value="analytics">{t('reconHub.tabs.analytics', 'Analytics')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showPredictive">
                {t('reconHub.settings.showPredictive', 'Show Predictive Analytics')}
              </Label>
              <Switch
                id="showPredictive"
                checked={settings.dashboard.showPredictiveAnalytics}
                onCheckedChange={(checked) => updateSettings('dashboard', 'showPredictiveAnalytics', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('reconHub.settings.thresholds', 'Performance Thresholds')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.settings.thresholdsDesc', 'Set target metrics and performance benchmarks')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetT2L">
                  {t('reconHub.settings.targetT2L', 'Target T2L (days)')}
                </Label>
                <Input
                  id="targetT2L"
                  type="number"
                  value={settings.thresholds.targetT2L}
                  onChange={(e) => updateSettings('thresholds', 'targetT2L', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticalT2L">
                  {t('reconHub.settings.criticalT2L', 'Critical T2L (days)')}
                </Label>
                <Input
                  id="criticalT2L"
                  type="number"
                  value={settings.thresholds.criticalT2L}
                  onChange={(e) => updateSettings('thresholds', 'criticalT2L', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxHoldingCost">
                  {t('reconHub.settings.maxHoldingCost', 'Max Holding Cost ($)')}
                </Label>
                <Input
                  id="maxHoldingCost"
                  type="number"
                  value={settings.thresholds.maxHoldingCost}
                  onChange={(e) => updateSettings('thresholds', 'maxHoldingCost', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onTimeTarget">
                  {t('reconHub.settings.onTimeTarget', 'On-Time Target (%)')}
                </Label>
                <Input
                  id="onTimeTarget"
                  type="number"
                  value={settings.thresholds.onTimeTarget}
                  onChange={(e) => updateSettings('thresholds', 'onTimeTarget', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('reconHub.settings.workflow', 'Workflow Settings')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.settings.workflowDesc', 'Configure workflow automation and approval requirements')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoStatusUpdates">
                {t('reconHub.settings.autoStatusUpdates', 'Automatic Status Updates')}
              </Label>
              <Switch
                id="autoStatusUpdates"
                checked={settings.workflow.enableAutomaticStatusUpdates}
                onCheckedChange={(checked) => updateSettings('workflow', 'enableAutomaticStatusUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requireApprovals">
                {t('reconHub.settings.requireApprovals', 'Require Approvals')}
              </Label>
              <Switch
                id="requireApprovals"
                checked={settings.workflow.requireApprovals}
                onCheckedChange={(checked) => updateSettings('workflow', 'requireApprovals', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultPriority">
                {t('reconHub.settings.defaultPriority', 'Default Priority')}
              </Label>
              <Select
                value={settings.workflow.defaultPriority}
                onValueChange={(value) => updateSettings('workflow', 'defaultPriority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('reconHub.priority.low', 'Low')}</SelectItem>
                  <SelectItem value="normal">{t('reconHub.priority.normal', 'Normal')}</SelectItem>
                  <SelectItem value="high">{t('reconHub.priority.high', 'High')}</SelectItem>
                  <SelectItem value="urgent">{t('reconHub.priority.urgent', 'Urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Alert className="flex-1 mr-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('reconHub.settings.saveWarning', 'Changes will affect all users accessing this ReconHub dashboard')}
              </AlertDescription>
            </Alert>
            <Button onClick={handleSaveSettings} disabled={isSaving} className="min-w-32">
              <Save className="h-4 w-4 mr-2" />
              {isSaving 
                ? t('reconHub.settings.saving', 'Saving...') 
                : t('reconHub.settings.save', 'Save Settings')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}