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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const departments: DepartmentData[] = [
    {
      id: 'sales',
      name: t('dashboard.departments.sales'),
      icon: <Car className="w-5 h-5" />,
      color: 'text-blue-600',
      orders: { total: 45, pending: 8, inProgress: 12, completed: 25 },
      revenue: 6750.00,
      efficiency: 92,
      route: '/app/sales'
    },
    {
      id: 'service', 
      name: t('dashboard.departments.service'),
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-green-600',
      orders: { total: 38, pending: 6, inProgress: 15, completed: 17 },
      revenue: 4280.50,
      efficiency: 87,
      route: '/app/service'
    },
    {
      id: 'recon',
      name: t('dashboard.departments.recon'),
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-orange-600',
      orders: { total: 29, pending: 5, inProgress: 8, completed: 16 },
      revenue: 2890.00,
      efficiency: 78,
      route: '/app/recon'
    },
    {
      id: 'carwash',
      name: t('dashboard.departments.car_wash'),
      icon: <Droplets className="w-5 h-5" />,
      color: 'text-cyan-600', 
      orders: { total: 67, pending: 4, inProgress: 18, completed: 45 },
      revenue: 1500.00,
      efficiency: 95,
      route: '/app/carwash'
    }
  ];

  const handleViewDepartment = (route: string) => {
    navigate(route);
  };

  const handleCreateOrder = (departmentId: string) => {
    // Navigate to create order form for specific department
    navigate(`/app/${departmentId}?action=create`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning';
      case 'inProgress': return 'text-primary';
      case 'completed': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-success';
    if (efficiency >= 80) return 'text-warning';
    return 'text-destructive';
  };

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
                    <p className="text-sm text-muted-foreground">
                      ${dept.revenue.toLocaleString()} {t('dashboard.department_overview.revenue')}
                    </p>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}