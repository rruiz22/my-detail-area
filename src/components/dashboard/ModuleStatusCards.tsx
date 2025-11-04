import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Car,
  Wrench,
  RefreshCw,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Shield,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

interface ModuleConfig {
  id: string;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';
  orderType: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  route: string;
}

export function ModuleStatusCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Calculate allowed order types
  const allowedOrderTypes = useMemo(() => {
    const types: string[] = [];

    if (hasPermission('sales_orders', 'view')) types.push('sales');
    if (hasPermission('service_orders', 'view')) types.push('service');
    if (hasPermission('recon_orders', 'view')) types.push('recon');
    if (hasPermission('car_wash', 'view')) types.push('carwash');

    return types;
  }, [hasPermission]);

  const { data: dashboardData } = useDashboardData(allowedOrderTypes);

  // Module configurations
  const allModules: ModuleConfig[] = useMemo(() => [
    {
      id: 'sales',
      module: 'sales_orders',
      orderType: 'sales',
      name: t('dashboard.departments.sales'),
      icon: <Car className="w-5 h-5" />,
      color: 'text-blue-600',
      route: '/sales'
    },
    {
      id: 'service',
      module: 'service_orders',
      orderType: 'service',
      name: t('dashboard.departments.service'),
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-green-600',
      route: '/service'
    },
    {
      id: 'recon',
      module: 'recon_orders',
      orderType: 'recon',
      name: t('dashboard.departments.recon'),
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-orange-600',
      route: '/recon'
    },
    {
      id: 'carwash',
      module: 'car_wash',
      orderType: 'carwash',
      name: t('dashboard.departments.car_wash'),
      icon: <Droplets className="w-5 h-5" />,
      color: 'text-cyan-600',
      route: '/carwash'
    }
  ], [t]);

  // Filter modules by user permissions
  const accessibleModules = useMemo(() => {
    return allModules.filter(module =>
      hasPermission(module.module, 'view')
    );
  }, [allModules, hasPermission]);

  // Get permission badge
  const getPermissionBadge = (module: ModuleConfig['module']) => {
    if (hasPermission(module, 'delete')) {
      return {
        label: t('dashboard.module_status.admin_access'),
        variant: 'default' as const,
        icon: <Trash2 className="w-3 h-3" />
      };
    }
    if (hasPermission(module, 'edit')) {
      return {
        label: t('dashboard.module_status.edit_access'),
        variant: 'secondary' as const,
        icon: <Edit className="w-3 h-3" />
      };
    }
    return {
      label: t('dashboard.module_status.view_only'),
      variant: 'outline' as const,
      icon: <Eye className="w-3 h-3" />
    };
  };

  // Get status badge based on pending orders
  const getStatusBadge = (pending: number, total: number) => {
    if (total === 0) return null;

    const pendingRatio = pending / total;

    if (pendingRatio > 0.5) {
      return {
        label: t('dashboard.module_status.critical'),
        color: 'bg-red-100 text-red-700',
        icon: <AlertTriangle className="w-3 h-3" />
      };
    }
    if (pendingRatio > 0.25) {
      return {
        label: t('dashboard.module_status.attention_needed'),
        color: 'bg-amber-100 text-amber-700',
        icon: <AlertTriangle className="w-3 h-3" />
      };
    }
    return {
      label: t('dashboard.module_status.healthy'),
      color: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle className="w-3 h-3" />
    };
  };

  // Empty state
  if (accessibleModules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('dashboard.module_status.title')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.module_status.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('dashboard.module_status.no_modules')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.module_status.request_access')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('dashboard.module_status.title')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.module_status.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accessibleModules.map(module => {
            const deptData = dashboardData?.departments.find(d => d.order_type === module.orderType);
            const permissionBadge = getPermissionBadge(module.module);
            const statusBadge = getStatusBadge(
              deptData?.pending || 0,
              deptData?.total || 0
            );

            const completionRate = deptData?.total
              ? Math.round(((deptData.completed || 0) / deptData.total) * 100)
              : 0;

            return (
              <Card
                key={module.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50"
                onClick={() => navigate(module.route)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "w-10 h-10 rounded-full bg-muted flex items-center justify-center",
                      module.color
                    )}>
                      {module.icon}
                    </div>
                    {statusBadge && (
                      <Badge variant="secondary" className={cn("text-xs", statusBadge.color)}>
                        {statusBadge.icon}
                        <span className="ml-1">{statusBadge.label}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-semibold text-sm">{module.name}</h4>
                    <Badge variant={permissionBadge.variant} className="text-xs mt-1">
                      {permissionBadge.icon}
                      <span className="ml-1">{permissionBadge.label}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Order counts */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.module_status.pending')}</p>
                      <p className="text-sm font-bold text-amber-600">{deptData?.pending || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.module_status.in_progress')}</p>
                      <p className="text-sm font-bold text-indigo-600">{deptData?.inProgress || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.module_status.completed')}</p>
                      <p className="text-sm font-bold text-emerald-600">{deptData?.completed || 0}</p>
                    </div>
                  </div>

                  {/* Completion progress */}
                  {(deptData?.total || 0) > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t('dashboard.module_status.total_orders')}: {deptData?.total}
                        </span>
                        <span className="text-xs font-semibold">{completionRate}%</span>
                      </div>
                      <Progress value={completionRate} className="h-1.5" />
                    </div>
                  )}

                  {/* Click hint */}
                  <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                    {t('dashboard.module_status.click_to_view')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
