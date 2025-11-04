import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Car, 
  Wrench, 
  RefreshCw, 
  Droplets, 
  Plus,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';

interface DepartmentData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  revenue: number;
  efficiency: number;
  route: string;
}

export function DepartmentOverview() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: dashboardData, isLoading } = useDashboardData();
  const { hasPermission } = usePermissions();

  const formatCurrency = (amount: number) => {
    const currencyMap = {
      'en': 'USD',
      'es': 'USD', // Assuming US Spanish
      'pt-BR': 'BRL'
    };
    const currency = currencyMap[i18n.language as keyof typeof currencyMap] || 'USD';

    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Build departments array from real data
  const allDepartments = [
    {
      id: 'sales',
      module: 'sales_orders' as const,
      name: t('dashboard.departments.sales'),
      icon: <Car className="w-5 h-5" />,
      color: 'text-blue-600',
      route: '/sales'
    },
    {
      id: 'service',
      module: 'service_orders' as const,
      name: t('dashboard.departments.service'),
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-green-600',
      route: '/service'
    },
    {
      id: 'recon',
      module: 'recon_orders' as const,
      name: t('dashboard.departments.recon'),
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-orange-600',
      route: '/recon'
    },
    {
      id: 'carwash',
      module: 'car_wash' as const,
      name: t('dashboard.departments.car_wash'),
      icon: <Droplets className="w-5 h-5" />,
      color: 'text-cyan-600',
      route: '/carwash'
    }
  ];

  // Filter departments by user permissions
  const allowedDepartments = allDepartments.filter(dept =>
    hasPermission(dept.module, 'view')
  );

  // Map real data to departments
  const departments: DepartmentData[] = allowedDepartments.map(dept => {
    const deptData = dashboardData?.departments.find(d => d.order_type === dept.id);

    return {
      ...dept,
      orders: {
        total: deptData?.total || 0,
        pending: deptData?.pending || 0,
        inProgress: deptData?.inProgress || 0,
        completed: deptData?.completed || 0
      },
      revenue: deptData?.revenue || 0,
      efficiency: deptData?.total ? Math.round((deptData.completed / deptData.total) * 100) : 0
    };
  });

  const handleViewDepartment = (route: string) => {
    navigate(route);
  };

  const handleCreateOrder = (departmentId: string) => {
    // Navigate to create order form for specific department
    navigate(`/${departmentId}?action=create`);
  };


  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-success';
    if (efficiency >= 80) return 'text-warning';
    return 'text-destructive';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('dashboard.department_overview.title')}</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('dashboard.department_overview.title')}</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {t('dashboard.department_overview.live_data')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full bg-muted flex items-center justify-center", dept.color)}>
                    {dept.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateOrder(dept.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDepartment(dept.route)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {dept.orders.total === 0 ? (
                /* Empty state for departments with no orders */
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                    {dept.icon}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('dashboard.department_overview.no_orders_yet')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('dashboard.department_overview.create_first_order')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateOrder(dept.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('dashboard.department_overview.create_order')}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Orders Status */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-warning" />
                        <span className="text-sm font-medium text-warning">{dept.orders.pending}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.department_overview.pending')}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <RefreshCw className="w-3 h-3 text-primary" />
                        <span className="text-sm font-medium text-primary">{dept.orders.inProgress}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.department_overview.in_progress')}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3 text-success" />
                        <span className="text-sm font-medium text-success">{dept.orders.completed}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.department_overview.completed')}</p>
                    </div>
                  </div>

                  {/* Efficiency */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('dashboard.department_overview.efficiency')}</span>
                      <span className={cn("text-sm font-bold", getEfficiencyColor(dept.efficiency))}>
                        {dept.efficiency}%
                      </span>
                    </div>
                    <Progress value={dept.efficiency} className="h-2" />
                  </div>

                  {/* Total Orders */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">{t('dashboard.department_overview.total_orders')}</span>
                    <span className="font-semibold">{dept.orders.total}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}