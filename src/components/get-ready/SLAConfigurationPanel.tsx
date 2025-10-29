import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import {
    useGetReadySLAConfig,
    useSLAConfigMutations,
    type SLAConfigInput,
} from '@/hooks/useGetReadySLAConfig';
import { AlertCircle, CheckCircle, Loader2, Save, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SLAConfigurationPanelProps {
  className?: string;
}

export function SLAConfigurationPanel({ className }: SLAConfigurationPanelProps) {
  console.log('📊 [SLAConfigurationPanel] Component RENDERED');
  const { t } = useTranslation();
  const { currentDealership, isLoading: isLoadingDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;

  const { data: config, isLoading: isLoadingConfig } = useGetReadySLAConfig(dealerId);
  const { upsertSLAConfig } = useSLAConfigMutations(dealerId);

  const isLoading = isLoadingDealership || isLoadingConfig || !dealerId;

  // Form state
  const [formData, setFormData] = useState<SLAConfigInput>({
    default_time_goal: 4,
    max_time_goal: 7,
    green_threshold: 1,
    warning_threshold: 3,
    danger_threshold: 4,
    enable_notifications: true,
    count_weekends: true,
    count_business_hours_only: false,
  });

  // Load config into form when available (or use defaults if no config exists)
  useEffect(() => {
    if (config) {
      setFormData({
        default_time_goal: config.default_time_goal,
        max_time_goal: config.max_time_goal,
        green_threshold: config.green_threshold,
        warning_threshold: config.warning_threshold,
        danger_threshold: config.danger_threshold,
        enable_notifications: config.enable_notifications,
        count_weekends: config.count_weekends,
        count_business_hours_only: config.count_business_hours_only,
      });
    } else if (!isLoadingConfig && dealerId) {
      // If no config exists and we're done loading, keep default values
      // This allows creating a new config for the dealership
      console.log('No SLA config found for dealership, using defaults');
    }
  }, [config, isLoadingConfig, dealerId]);

  const handleSave = () => {
    upsertSLAConfig.mutate(formData);
  };

  const getStatusPreview = (days: number) => {
    if (days <= formData.green_threshold) {
      return { color: 'text-green-600', bg: 'bg-green-50', label: t('get_ready.sla.preview.on_track'), icon: CheckCircle };
    } else if (days <= formData.warning_threshold) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: t('get_ready.sla.preview.warning'), icon: AlertCircle };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-50', label: t('get_ready.sla.preview.critical'), icon: AlertCircle };
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('get_ready.sla.title')}
        </CardTitle>
        <CardDescription>
          {t('get_ready.sla.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Goals Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('get_ready.sla.time_goals.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('get_ready.sla.time_goals.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_time_goal">
                {t('get_ready.sla.time_goals.default_label')}
                <span className="text-xs text-muted-foreground ml-2">{t('get_ready.sla.time_goals.default_help')}</span>
              </Label>
              <Input
                id="default_time_goal"
                type="number"
                min="1"
                max={formData.max_time_goal}
                value={formData.default_time_goal}
                onChange={(e) =>
                  setFormData({ ...formData, default_time_goal: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_time_goal">
                {t('get_ready.sla.time_goals.max_label')}
                <span className="text-xs text-muted-foreground ml-2">{t('get_ready.sla.time_goals.max_help')}</span>
              </Label>
              <Input
                id="max_time_goal"
                type="number"
                min={formData.default_time_goal}
                max="14"
                value={formData.max_time_goal}
                onChange={(e) =>
                  setFormData({ ...formData, max_time_goal: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Alert Thresholds Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('get_ready.sla.thresholds.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('get_ready.sla.thresholds.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="green_threshold" className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                {t('get_ready.sla.thresholds.green_label')}
              </Label>
              <Input
                id="green_threshold"
                type="number"
                min="0"
                max={formData.warning_threshold - 1}
                value={formData.green_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, green_threshold: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                ≤ {formData.green_threshold} {formData.green_threshold === 1 ? 'day' : 'days'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warning_threshold" className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                {t('get_ready.sla.thresholds.warning_label')}
              </Label>
              <Input
                id="warning_threshold"
                type="number"
                min={formData.green_threshold + 1}
                max={formData.danger_threshold - 1}
                value={formData.warning_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, warning_threshold: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                {formData.green_threshold + 1} - {formData.warning_threshold} days
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="danger_threshold" className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                {t('get_ready.sla.thresholds.danger_label')}
              </Label>
              <Input
                id="danger_threshold"
                type="number"
                min={formData.warning_threshold + 1}
                max="14"
                value={formData.danger_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, danger_threshold: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                ≥ {formData.danger_threshold} days
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Preview Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('get_ready.sla.preview.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('get_ready.sla.preview.description')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 5].map((days) => {
              const preview = getStatusPreview(days);
              const Icon = preview.icon;
              return (
                <div
                  key={days}
                  className={`p-3 rounded-lg border ${preview.bg} ${preview.color}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{preview.label}</span>
                  </div>
                  <p className="text-xs opacity-75">
                    {days} {days === 1 ? 'day' : 'days'} in step
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Additional Options */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('get_ready.sla.options.title')}</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable_notifications">{t('get_ready.sla.options.enable_notifications')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.sla.options.enable_notifications_help')}
                </p>
              </div>
              <Switch
                id="enable_notifications"
                checked={formData.enable_notifications}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enable_notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="count_weekends">{t('get_ready.sla.options.count_weekends')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.sla.options.count_weekends_help')}
                </p>
              </div>
              <Switch
                id="count_weekends"
                checked={formData.count_weekends}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, count_weekends: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="count_business_hours_only">{t('get_ready.sla.options.business_hours_only')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.sla.options.business_hours_only_help')}
                </p>
              </div>
              <Switch
                id="count_business_hours_only"
                checked={formData.count_business_hours_only}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, count_business_hours_only: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={upsertSLAConfig.isPending}
            className="min-w-32"
          >
            {upsertSLAConfig.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('get_ready.sla.actions.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('get_ready.sla.actions.save')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
