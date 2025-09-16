import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Download, 
  Filter, 
  Search,
  Calendar,
  User,
  Shield,
  Settings,
  Key,
  Bell,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

interface ActivityRecord {
  id: string;
  action_type: string;
  action_description?: string;
  details?: any;
  ip_address?: unknown;
  created_at: string;
}

export function ActivityAuditTab() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      let query = supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterType !== 'all') {
        query = query.eq('action_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);

    } catch (error: any) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const exportActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csvContent = [
        ['Date', 'Action Type', 'Description', 'IP Address', 'Details'].join(','),
        ...(data || []).map((activity: ActivityRecord) => [
          format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
          activity.action_type,
          activity.action_description || '',
          String(activity.ip_address) || '',
          JSON.stringify(activity.details || {})
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Error exporting activities:', error);
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'profile_updated':
        return <User className="h-4 w-4" />;
      case 'password_changed':
        return <Key className="h-4 w-4" />;
      case 'preferences_updated':
        return <Settings className="h-4 w-4" />;
      case 'session_terminated':
        return <Shield className="h-4 w-4" />;
      case 'notification_settings_updated':
        return <Bell className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'profile_updated':
      case 'preferences_updated':
        return 'bg-blue-500';
      case 'password_changed':
      case 'session_terminated':
        return 'bg-green-500';
      case 'login_failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredActivities = activities.filter(activity =>
    activity.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.action_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchActivities();
  }, [filterType, fetchActivities]);

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('profile.activity_filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.search_activities')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('profile.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.activity_type')}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('profile.all_activities')}</SelectItem>
                  <SelectItem value="profile_updated">{t('profile.profile_updates')}</SelectItem>
                  <SelectItem value="password_changed">{t('profile.password_changes')}</SelectItem>
                  <SelectItem value="preferences_updated">{t('profile.preference_changes')}</SelectItem>
                  <SelectItem value="session_terminated">{t('profile.session_changes')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('profile.export_data')}</label>
              <Button variant="outline" onClick={exportActivities} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {t('profile.export_csv')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('profile.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-start gap-4">
                  <div className={`rounded-full p-2 ${getActivityColor(activity.action_type)}`}>
                    {getActivityIcon(activity.action_type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {activity.action_description || activity.action_type}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {activity.ip_address && (
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {String(activity.ip_address)}
                        </span>
                      )}
                    </div>
                    
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          {t('profile.view_details')}
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                {index < filteredActivities.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterType !== 'all' 
                    ? t('profile.no_activities_found')
                    : t('profile.no_activities_yet')
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}