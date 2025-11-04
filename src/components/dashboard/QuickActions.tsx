import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Car,
  Wrench,
  RefreshCw,
  Droplets,
  FileText,
  Zap,
  Package,
  MessageCircle,
  Plus,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  action: 'create' | 'view';
  module: string;
  permission: 'edit' | 'view';
}

export function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Define all possible quick actions
  const allActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-sales',
      label: t('dashboard.quick_actions.new_sales_order'),
      icon: <Car className="w-5 h-5" />,
      color: 'text-blue-600',
      route: '/sales?action=create',
      action: 'create',
      module: 'sales_orders',
      permission: 'edit'
    },
    {
      id: 'new-service',
      label: t('dashboard.quick_actions.new_service_order'),
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-green-600',
      route: '/service?action=create',
      action: 'create',
      module: 'service_orders',
      permission: 'edit'
    },
    {
      id: 'new-recon',
      label: t('dashboard.quick_actions.new_recon_order'),
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-orange-600',
      route: '/recon?action=create',
      action: 'create',
      module: 'recon_orders',
      permission: 'edit'
    },
    {
      id: 'new-carwash',
      label: t('dashboard.quick_actions.new_car_wash'),
      icon: <Droplets className="w-5 h-5" />,
      color: 'text-cyan-600',
      route: '/carwash?action=create',
      action: 'create',
      module: 'car_wash',
      permission: 'edit'
    },
    {
      id: 'view-reports',
      label: t('dashboard.quick_actions.view_reports'),
      icon: <FileText className="w-5 h-5" />,
      color: 'text-indigo-600',
      route: '/reports',
      action: 'view',
      module: 'reports',
      permission: 'view'
    },
    {
      id: 'get-ready',
      label: t('dashboard.quick_actions.get_ready'),
      icon: <Zap className="w-5 h-5" />,
      color: 'text-emerald-600',
      route: '/get-ready',
      action: 'view',
      module: 'productivity',
      permission: 'view'
    },
    {
      id: 'view-stock',
      label: t('dashboard.quick_actions.view_stock'),
      icon: <Package className="w-5 h-5" />,
      color: 'text-amber-600',
      route: '/stock',
      action: 'view',
      module: 'stock',
      permission: 'view'
    },
    {
      id: 'team-chat',
      label: t('dashboard.quick_actions.team_chat'),
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'text-purple-600',
      route: '/chat',
      action: 'view',
      module: 'chat',
      permission: 'view'
    }
  ], [t]);

  // Filter actions by user permissions
  const availableActions = useMemo(() => {
    return allActions.filter(action =>
      hasPermission(action.module, action.permission)
    );
  }, [allActions, hasPermission]);

  const handleAction = (route: string) => {
    navigate(route);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          {t('dashboard.quick_actions.title')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.quick_actions.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableActions.length === 0 ? (
          // Empty state - no permissions
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('dashboard.quick_actions.no_actions_available')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.quick_actions.contact_admin')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto flex flex-col items-center gap-2 p-4 hover:shadow-md transition-all"
                onClick={() => handleAction(action.route)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full bg-muted flex items-center justify-center",
                  action.color
                )}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {action.label}
                </span>
                {action.action === 'create' && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    <Plus className="w-2.5 h-2.5 mr-0.5" />
                    {t('dashboard.quick_actions.create_order')}
                  </Badge>
                )}
                {action.action === 'view' && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Eye className="w-2.5 h-2.5 mr-0.5" />
                    {t('dashboard.quick_actions.view_module')}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
