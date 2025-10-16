import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  Users, 
  UserCheck, 
  Mail, 
  ClipboardList, 
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DealershipStats {
  total_users: number;
  active_users: number;
  pending_invitations: number;
  total_orders: number;
  orders_this_month: number;
  pending_orders: number;
  completed_orders: number;
  total_groups: number;
  users_with_groups: number;
}

interface DealershipStatsCardProps {
  dealerId: number;
  className?: string;
}

export const DealershipStatsCard: React.FC<DealershipStatsCardProps> = ({
  dealerId,
  className,
}) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DealershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    // Validación de dealerId antes de hacer consultas
    if (!dealerId || dealerId === undefined) {
      console.warn('⚠️ DealershipStatsCard: dealerId is undefined, skipping stats fetch');
      setLoading(false);
      setError('No dealership selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching stats for dealership:', dealerId);

      // SOLUCIÓN PERMANENTE: Consultas directas de Supabase
      // Ejecutar múltiples consultas en paralelo para mejor rendimiento
      const [
        allUsersQuery,
        activeUsersQuery,
        ordersQuery,
        groupsQuery,
        membershipQuery,
        ordersThisMonthQuery,
        pendingOrdersQuery,
        completedOrdersQuery
      ] = await Promise.all([
        // Total usuarios del dealership
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dealership_id', dealerId),

        // Usuarios activos (excluyendo roles inactivos)
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dealership_id', dealerId)
          .in('role', ['system_admin', 'admin', 'manager', 'viewer', 'technician']),

        // Total órdenes del dealership
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId),

        // Total grupos activos del dealership
        supabase
          .from('dealer_groups')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId)
          .eq('is_active', true),

        // Usuarios con grupos asignados (filtrado por dealership)
        supabase
          .from('user_group_memberships')
          .select(`
            user_id,
            dealer_groups!inner (
              dealer_id
            )
          `, { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('dealer_groups.dealer_id', dealerId),

        // Órdenes de este mes
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

        // Órdenes pendientes
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId)
          .in('status', ['pending', 'in_progress']),

        // Órdenes completadas
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId)
          .eq('status', 'completed')
      ]);

      // Verificar errores en cualquiera de las consultas
      const errors = [
        allUsersQuery.error,
        activeUsersQuery.error,
        ordersQuery.error,
        groupsQuery.error,
        membershipQuery.error,
        ordersThisMonthQuery.error,
        pendingOrdersQuery.error,
        completedOrdersQuery.error
      ].filter(error => error);

      if (errors.length > 0) {
        console.error('Database query errors:', errors);
        throw new Error(`Database query failed: ${errors[0]?.message || 'Unknown database error'}`);
      }

      // Construir estadísticas con datos reales y precisos
      const statsData: DealershipStats = {
        total_users: allUsersQuery.count || 0,
        active_users: activeUsersQuery.count || 0,
        pending_invitations: 0, // Campo para futuro uso
        total_orders: ordersQuery.count || 0,
        orders_this_month: ordersThisMonthQuery.count || 0,
        pending_orders: pendingOrdersQuery.count || 0,
        completed_orders: completedOrdersQuery.count || 0,
        total_groups: groupsQuery.count || 0,
        users_with_groups: membershipQuery.count || 0
      };

      console.log('✅ Dealership stats calculated:', {
        dealerId,
        stats: statsData
      });

      setStats(statsData);

    } catch (err: unknown) {
      console.error('❌ Error fetching dealership stats for dealer', dealerId, ':', err);

      // Manejo robusto de diferentes tipos de errores
      let errorMessage = 'Failed to load dealership statistics';

      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      } else if (err && typeof err === 'object' && 'code' in err) {
        const code = String(err.code);
        const details = ('details' in err) ? String(err.details) : 'Unknown error';
        errorMessage = `Database error (${code}): ${details}`;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);

      // Fallback: setear datos vacíos para evitar crashes de UI
      setStats({
        total_users: 0,
        active_users: 0,
        pending_invitations: 0,
        total_orders: 0,
        orders_this_month: 0,
        pending_orders: 0,
        completed_orders: 0,
        total_groups: 0,
        users_with_groups: 0
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('dealerships.statistics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
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
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('messages.error')}</p>
            <p className="text-xs">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('common.no_data')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statsItems = [
    {
      icon: Users,
      label: t('dealerships.total_users'),
      value: stats.total_users,
      color: 'blue',
      subtext: `${stats.active_users} ${t('dealerships.users_active')}`
    },
    {
      icon: UserCheck,
      label: t('dealerships.active_users'),
      value: stats.active_users,
      color: 'green',
      percentage: stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0
    },
    {
      icon: Mail,
      label: t('dealerships.pending_invitations'),
      value: stats.pending_invitations,
      color: 'orange',
      badge: stats.pending_invitations > 0 ? t('dealerships.action_required') : t('dealerships.up_to_date')
    },
    {
      icon: ClipboardList,
      label: t('dealerships.total_orders'),
      value: stats.total_orders,
      color: 'purple',
      subtext: `${stats.orders_this_month} ${t('dealerships.orders_this_month')}`
    },
  ];

  const monthlyGrowth = stats.total_orders > 0 
    ? Math.round((stats.orders_this_month / stats.total_orders) * 100) 
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('dealerships.statistics')}
        </CardTitle>
        <CardDescription>
          {t('dealerships.activity_summary')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="flex flex-col p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 text-${item.color}-500`} />
                  {item.badge && (
                    <Badge 
                      variant={item.badge === t('dealerships.action_required') ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{(item.value || 0).toLocaleString()}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  
                  {item.subtext && (
                    <p className="text-xs text-muted-foreground">
                      {item.subtext}
                    </p>
                  )}
                  
                  {item.percentage !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      {item.percentage > 80 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-orange-500" />
                      )}
                      <span className={item.percentage > 80 ? 'text-green-600' : 'text-orange-600'}>
                        {item.percentage}% {t('dealerships.users_active')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Growth Indicator */}
        {stats.total_orders > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('dealerships.orders_growth')}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.orders_this_month} {t('dealerships.of_total', { total: stats.total_orders })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">
                  {monthlyGrowth}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};