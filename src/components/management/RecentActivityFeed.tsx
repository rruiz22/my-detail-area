import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Mail, 
  UserPlus, 
  Activity,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';

interface SystemActivity {
  activity_type: string;
  activity_description: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user_email: string;
}

interface RecentActivityFeedProps {
  className?: string;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivity();
    
    // Refresh activity every 2 minutes
    const interval = setInterval(fetchRecentActivity, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .rpc('get_recent_system_activity');

      if (error) throw error;

      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching recent activity:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'dealership_created':
        return Building2;
      case 'invitation_sent':
        return Mail;
      case 'user_joined':
        return UserPlus;
      default:
        return Activity;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'dealership_created':
        return 'text-blue-600 bg-blue-100';
      case 'invitation_sent':
        return 'text-orange-600 bg-orange-100';
      case 'user_joined':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityBadge = (activityType: string) => {
    switch (activityType) {
      case 'dealership_created':
        return { label: t('common.new'), variant: 'secondary' as const };
      case 'invitation_sent':
        return { label: t('invitations.title'), variant: 'outline' as const };
      case 'user_joined':
        return { label: t('users.title'), variant: 'default' as const };
      default:
        return { label: t('common.activity'), variant: 'secondary' as const };
    }
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es;
      case 'pt-BR':
        return ptBR;
      default:
        return undefined;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('management.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>{t('messages.error')}</p>
            <Button variant="outline" size="sm" onClick={fetchRecentActivity} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('management.recent_activity')}
            </CardTitle>
            <CardDescription>
              {t('management.recent_activity')} (7 {t('invitations.accept.days')})
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchRecentActivity}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('management.no_activity')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.activity_type);
              const iconColorClass = getActivityColor(activity.activity_type);
              const badge = getActivityBadge(activity.activity_type);
              
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full ${iconColorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: getDateLocale()
                        })}
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground mb-1">
                      {activity.activity_description}
                    </p>
                    
                    {activity.user_email && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {activity.user_email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {activity.user_email}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    ID: {activity.entity_id.slice(0, 8)}...
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};