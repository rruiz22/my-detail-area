/**
 * NotificationSoundSettings Component
 *
 * Enterprise-grade sound configuration for notifications
 * Only accessible to system_admin users
 *
 * Features:
 * - Enable/disable sound globally
 * - Configure sound for each priority level
 * - Volume control
 * - Sound preview
 * - Persistent settings via localStorage
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/utils/notificationUtils';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotificationSoundPreferences } from '@/hooks/useNotificationSoundPreferences';

export function NotificationSoundSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    preferences,
    isLoading,
    updatePreference,
    savePreferences,
    resetToDefaults,
  } = useNotificationSoundPreferences();

  const handleVolumeChange = (value: number[]) => {
    updatePreference('volume', value[0]);
  };

  const handleTogglePriority = (priority: 'low' | 'normal' | 'high' | 'urgent', enabled: boolean) => {
    updatePreference(`playFor${priority.charAt(0).toUpperCase() + priority.slice(1)}` as any, enabled);
  };

  const handleTestSound = async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    try {
      await playNotificationSound(priority);
      toast({
        title: t('common.success'),
        description: t('settings.notification_sound.test_played', { priority }),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('settings.notification_sound.test_error'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await savePreferences();
      toast({
        title: t('common.success'),
        description: t('settings.notification_sound.saved'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('settings.notification_sound.save_error'),
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    resetToDefaults();
    toast({
      title: t('common.success'),
      description: t('settings.notification_sound.reset'),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center gap-2">
          {preferences.enabled ? (
            <Volume2 className="h-5 w-5 text-primary" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <CardTitle>{t('settings.notification_sound.title')}</CardTitle>
            <CardDescription>{t('settings.notification_sound.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Global Enable/Disable */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">
              {t('settings.notification_sound.enable_sounds')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.notification_sound.enable_sounds_description')}
            </p>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(checked) => updatePreference('enabled', checked)}
          />
        </div>

        {preferences.enabled && (
          <>
            {/* Volume Control */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {t('settings.notification_sound.volume')}
                  </Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {Math.round(preferences.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[preferences.volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.notification_sound.volume_description')}
                </p>
              </div>
            </div>

            {/* Priority Levels */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                {t('settings.notification_sound.priority_levels')}
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                {t('settings.notification_sound.priority_levels_description')}
              </p>

              {/* Urgent */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50/30 border-red-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium text-red-700">
                      {t('settings.notification_sound.urgent')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestSound('urgent')}
                      className="h-6 px-2"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t('settings.notification_sound.test')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.notification_sound.urgent_description')}
                  </p>
                </div>
                <Switch
                  checked={preferences.playForUrgent}
                  onCheckedChange={(checked) => handleTogglePriority('urgent', checked)}
                />
              </div>

              {/* High */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/30 border-amber-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium text-amber-700">
                      {t('settings.notification_sound.high')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestSound('high')}
                      className="h-6 px-2"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t('settings.notification_sound.test')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.notification_sound.high_description')}
                  </p>
                </div>
                <Switch
                  checked={preferences.playForHigh}
                  onCheckedChange={(checked) => handleTogglePriority('high', checked)}
                />
              </div>

              {/* Normal */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">
                      {t('settings.notification_sound.normal')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestSound('normal')}
                      className="h-6 px-2"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t('settings.notification_sound.test')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.notification_sound.normal_description')}
                  </p>
                </div>
                <Switch
                  checked={preferences.playForNormal}
                  onCheckedChange={(checked) => handleTogglePriority('normal', checked)}
                />
              </div>

              {/* Low */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium text-muted-foreground">
                      {t('settings.notification_sound.low')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestSound('low')}
                      className="h-6 px-2"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t('settings.notification_sound.test')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.notification_sound.low_description')}
                  </p>
                </div>
                <Switch
                  checked={preferences.playForLow}
                  onCheckedChange={(checked) => handleTogglePriority('low', checked)}
                />
              </div>
            </div>

            {/* Sound Configuration Details */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium mb-2">{t('settings.notification_sound.technical_details')}</h4>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <p>Frequency: 800 Hz</p>
                <p>Duration: 150 ms</p>
                <p>Type: Sine wave (Web Audio API)</p>
                <p>Current volume: {Math.round(preferences.volume * 100)}%</p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!preferences.enabled}
          >
            {t('common.action_buttons.reset')}
          </Button>

          <Button onClick={handleSave}>
            {t('common.action_buttons.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
