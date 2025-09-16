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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Users, 
  ClipboardList, 
  Mail, 
  Activity,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SystemStats {
  total_dealerships: number;
  active_dealerships: number;
  total_users: number;
  active_users: number;
  total_orders: number;
  orders_this_month: number;
  orders_this_week: number;
  pending_invitations: number;
  system_health_score: number;
}

interface SystemStatsCardProps {
  className?: string;
}

export const SystemStatsCard: React.FC<SystemStatsCardProps> = ({ className }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
    
    // Real-time subscription for system changes
    const channel = supabase
      .channel('system_stats_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dealerships'
        },
        () => {
          console.log('Dealerships changed, refreshing stats...');
          fetchSystemStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dealer_memberships'
        },
        () => {
          console.log('Memberships changed, refreshing stats...');
          fetchSystemStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          console.log('Orders changed, refreshing stats...');
          fetchSystemStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSystemStats = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .rpc('get_system_stats');

      if (error) throw error;

      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err: unknown) {
      console.error('Error fetching system stats:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('management.system_status')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>{error || t('messages.error')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthColor = stats.system_health_score >= 80 ? 'text-green-600' : 
                     stats.system_health_score >= 60 ? 'text-yellow-600' : 'text-red-600';
  
  const healthStatus = stats.system_health_score >= 80 ? t('common.active') : 
                       stats.system_health_score >= 60 ? 'Atención' : 'Crítico';

  const statsItems = [
    {
      icon: Building2,
      label: t('management.dealerships'),
      value: stats.total_dealerships,
      subValue: stats.active_dealerships,
      subLabel: t('dealerships.active'),
      color: 'blue',
      percentage: stats.total_dealerships > 0 ? Math.round((stats.active_dealerships / stats.total_dealerships) * 100) : 0
    },
    {
      icon: Users,
      label: t('management.total_users'),
      value: stats.total_users,
      subValue: stats.active_users,
      subLabel: t('dealerships.active_users'),
      color: 'green',
      percentage: stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0
    },
    {
      icon: ClipboardList,
      label: t('dealerships.total_orders'),
      value: stats.total_orders,
      subValue: stats.orders_this_month,
      subLabel: t('dealerships.orders_this_month'),
      color: 'purple'
    },
    {
      icon: Mail,
      label: t('dealerships.pending_invitations'),
      value: stats.pending_invitations,
      color: 'orange',
      badge: stats.pending_invitations > 0 ? t('dealerships.action_required') : t('dealerships.up_to_date')
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('management.system_status')}
        </CardTitle>
        <CardDescription>
          {t('management.system_overview')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Health Score */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${stats.system_health_score >= 80 ? 'bg-green-100 text-green-600' : 
              stats.system_health_score >= 60 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
              {stats.system_health_score >= 80 ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium">{t('management.system_health')}</p>
              <p className={`text-sm ${healthColor}`}>{healthStatus}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${healthColor}`}>{stats.system_health_score}%</p>
            <Progress value={stats.system_health_score} className="w-20 mt-1" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 text-${item.color}-500`} />
                  <div>
                    <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    {item.subValue !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {item.subValue} {item.subLabel}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {item.badge && (
                    <Badge 
                      variant={item.badge === t('dealerships.action_required') ? 'destructive' : 'secondary'}
                      className="text-xs mb-1"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {item.percentage !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`h-3 w-3 ${item.percentage > 80 ? 'text-green-500' : 'text-yellow-500'}`} />
                      <span className={`text-sm font-medium ${item.percentage > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly Activity Summary */}
        {stats.orders_this_week > 0 && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">{t('management.weekly_activity')}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.orders_this_week} {t('management.orders_processed')}
                </p>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">
                  +{Math.round((stats.orders_this_week / stats.total_orders) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};