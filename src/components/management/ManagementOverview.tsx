import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Settings,
  TrendingUp,
  Activity,
  Shield,
  Database,
  ArrowRight
} from 'lucide-react';
import { SystemStatsCard } from './SystemStatsCard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { DealershipPerformanceTable } from './DealershipPerformanceTable';

export const ManagementOverview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Users,
      label: t('management.user_management'),
      description: t('user_management.description'),
      action: () => navigate('/users'),
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Building2,
      label: t('management.dealership_management'),
      description: 'Gestionar concesionarios y configuraciones',
      action: () => navigate('/dealerships'),
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: Shield,
      label: t('management.permission_management'),
      description: 'Configurar roles y permisos del sistema',
      action: () => navigate('/management'),
      color: 'text-purple-600 bg-purple-100'
    },
    {
      icon: Database,
      label: 'Configuración Sistema',
      description: 'Configuración avanzada del sistema',
      action: () => navigate('/settings'),
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            {t('management.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('management.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {t('management.admin_access')}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
                  onClick={action.action}
                >
                  <div className={`p-3 rounded-full ${action.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Stats */}
      <SystemStatsCard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 1 column */}
        <div className="lg:col-span-1">
          <RecentActivityFeed />
        </div>
        
        {/* Performance Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <DealershipPerformanceTable />
        </div>
      </div>
    </div>
  );
};