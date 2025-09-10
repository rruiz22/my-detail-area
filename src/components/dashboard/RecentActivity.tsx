import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Car,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { StatusBadge } from '@/components/StatusBadge';

interface ActivityItem {
  id: string;
  type: 'order_created' | 'order_updated' | 'order_completed' | 'user_action';
  title: string;
  description: string;
  user: string;
  department: 'Sales' | 'Service' | 'Recon' | 'Car Wash';
  timestamp: Date;
  orderId?: string;
  status?: 'Pending' | 'In Progress' | 'Complete' | 'Cancelled';
  vehicle?: string;
}

export function RecentActivity() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<string>('all');

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // Mock recent activity data
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'order_created',
      title: t('dashboard.activity.order_created'),
      description: t('dashboard.activity.new_sales_order_desc'),
      user: 'John Smith',
      department: 'Sales',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      orderId: 'SO-2024-156',
      status: 'Pending',
      vehicle: '2025 BMW X6'
    },
    {
      id: '2', 
      type: 'order_updated',
      title: t('dashboard.activity.order_updated'),
      description: t('dashboard.activity.status_changed_desc'),
      user: 'Maria Garcia',
      department: 'Service',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      orderId: 'SV-2024-089',
      status: 'In Progress',
      vehicle: '2023 Toyota Camry'
    },
    {
      id: '3',
      type: 'order_completed',
      title: t('dashboard.activity.order_completed'),
      description: t('dashboard.activity.recon_completed_desc'),
      user: 'Alex Johnson',
      department: 'Recon',
      timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      orderId: 'RC-2024-234',
      status: 'Complete',
      vehicle: '2022 Ford F-150'
    },
    {
      id: '4',
      type: 'order_created',
      title: t('dashboard.activity.order_created'),
      description: t('dashboard.activity.car_wash_created_desc'),
      user: 'Lisa Chen',
      department: 'Car Wash',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      orderId: 'CW-2024-445',
      status: 'Pending',
      vehicle: '2024 Honda Accord'
    },
    {
      id: '5',
      type: 'user_action',
      title: t('dashboard.activity.user_login'),
      description: t('dashboard.activity.user_logged_in_desc'),
      user: 'Roberto Silva',
      department: 'Sales',
      timestamp: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
    }
  ];

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.department === filter);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <Car className="w-4 h-4 text-primary" />;
      case 'order_updated':
        return <RefreshCw className="w-4 h-4 text-warning" />;
      case 'order_completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'user_action':
        return <User className="w-4 h-4 text-secondary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'Sales': return 'bg-blue-100 text-blue-700';
      case 'Service': return 'bg-green-100 text-green-700';
      case 'Recon': return 'bg-orange-100 text-orange-700';
      case 'Car Wash': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard.activity.recent_activity')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              {t('dashboard.activity.filter')}
            </Button>
            <Button variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge 
            variant={filter === 'all' ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            {t('dashboard.activity.all')}
          </Badge>
          <Badge 
            variant={filter === 'Sales' ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setFilter('Sales')}
          >
            {t('dashboard.departments.sales')}
          </Badge>
          <Badge 
            variant={filter === 'Service' ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setFilter('Service')}
          >
            {t('dashboard.departments.service')}
          </Badge>
          <Badge 
            variant={filter === 'Recon' ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setFilter('Recon')}
          >
            {t('dashboard.departments.recon')}
          </Badge>
          <Badge 
            variant={filter === 'Car Wash' ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setFilter('Car Wash')}
          >
            {t('dashboard.departments.car_wash')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96 px-6">
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        
                        {activity.vehicle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('dashboard.activity.vehicle')}: {activity.vehicle}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getDepartmentColor(activity.department)} variant="secondary">
                            {activity.department}
                          </Badge>
                          
                          {activity.orderId && (
                            <Badge variant="outline" className="text-xs">
                              {activity.orderId}
                            </Badge>
                          )}
                          
                          {activity.status && (
                            <StatusBadge status={activity.status} />
                          )}
                          
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.timestamp, { 
                            addSuffix: true,
                            locale: getLocale()
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < filteredActivities.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}