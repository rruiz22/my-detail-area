import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Download, Shield, Trash2, Database, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DataPrivacyTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataSharing, setDataSharing] = useState({
    analytics: true,
    marketing: false,
    thirdParty: false,
  });

  const exportPersonalData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      // Collect all user data
      const [profileData, preferencesData, activityData, sessionsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
        supabase.from('user_activity_log').select('*').eq('user_id', user.id),
        supabase.from('user_sessions').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        user_info: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        },
        profile: profileData.data,
        preferences: preferencesData.data,
        activity_log: activityData.data,
        sessions: sessionsData.data,
        export_date: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Log the export activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'data_exported',
          action_description: 'Personal data exported',
        });

      toast({
        title: t('common.success'),
        description: t('profile.data_exported'),
      });

    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error exporting data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      // Log the deletion request
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'account_deletion_requested',
          action_description: 'Account deletion requested by user',
        });

      // In a real app, you would typically mark the account for deletion
      // rather than immediately deleting it, to allow for recovery period
      toast({
        title: t('profile.deletion_requested'),
        description: t('profile.deletion_requested_desc'),
      });

    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error requesting account deletion',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Sharing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('profile.data_sharing')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">{t('profile.analytics_data')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('profile.analytics_data_desc')}
              </p>
            </div>
            <Switch
              checked={dataSharing.analytics}
              onCheckedChange={(checked) => 
                setDataSharing(prev => ({ ...prev, analytics: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">{t('profile.marketing_data')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('profile.marketing_data_desc')}
              </p>
            </div>
            <Switch
              checked={dataSharing.marketing}
              onCheckedChange={(checked) => 
                setDataSharing(prev => ({ ...prev, marketing: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">{t('profile.third_party_data')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('profile.third_party_data_desc')}
              </p>
            </div>
            <Switch
              checked={dataSharing.thirdParty}
              onCheckedChange={(checked) => 
                setDataSharing(prev => ({ ...prev, thirdParty: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('profile.data_export')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('profile.data_export_desc')}
          </p>
          
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5 text-blue-600" />
              <div className="space-y-2">
                <h4 className="font-medium">{t('profile.export_includes')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('profile.export_profile_data')}</li>
                  <li>• {t('profile.export_preferences')}</li>
                  <li>• {t('profile.export_activity_log')}</li>
                  <li>• {t('profile.export_session_data')}</li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={exportPersonalData} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            {loading ? t('profile.exporting') : t('profile.export_my_data')}
          </Button>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('profile.data_retention')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('profile.data_retention_desc')}
          </p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">{t('profile.activity_logs')}</span>
              <span className="text-sm text-muted-foreground">{t('profile.retained_90_days')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">{t('profile.session_data')}</span>
              <span className="text-sm text-muted-foreground">{t('profile.retained_30_days')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">{t('profile.profile_data')}</span>
              <span className="text-sm text-muted-foreground">{t('profile.retained_until_deletion')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('profile.danger_zone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
            <h4 className="font-medium text-destructive mb-2">
              {t('profile.delete_account')}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('profile.delete_account_desc')}
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('profile.delete_my_account')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('profile.confirm_deletion')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('profile.deletion_warning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? t('profile.deleting') : t('profile.delete_account')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}