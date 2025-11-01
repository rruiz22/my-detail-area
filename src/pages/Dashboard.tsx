import dealershipHero from "@/assets/dealership-hero.jpg";
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { DepartmentOverview } from '@/components/dashboard/DepartmentOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNotifications } from "@/hooks/useNotifications";
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle, Clock, MessageCircle, Plus, Settings, TrendingUp, Users, Zap } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import * as logger from '@/utils/logger';
import { TestSMSButton } from '@/components/testing/TestSMSButton';

export default function Dashboard() {
  logger.dev('🟢 Dashboard component is RENDERING');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { data: dashboardData } = useDashboardData();
  const { hasPermission } = usePermissions();

  const pendingCount = dashboardData?.overall.pendingOrders || 0;

  const handleQuickAction = (action: string, route?: string) => {
    if (route) {
      navigate(route);
    }
  };
  return (
    <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gray-900 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
          {/* Background Image */}
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: `url(${dealershipHero})`
          }} />
          {/* Dark Overlay for better text contrast */}
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />

          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">{t('dashboard.hero.welcome')}</h1>
            <p className="text-lg sm:text-xl text-white/90">{t('dashboard.hero.subtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {/* New Order - Disabled/Informational only */}
              {(hasPermission('sales_orders', 'edit') ||
                hasPermission('service_orders', 'edit') ||
                hasPermission('recon_orders', 'edit') ||
                hasPermission('car_wash', 'edit')) && (
                <Button
                  variant="secondary"
                  disabled
                  className="bg-white/90 text-gray-900 cursor-not-allowed opacity-75"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.hero.new_order')}
                </Button>
              )}

              {/* View Pending Orders - Disabled/Informational only */}
              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  disabled
                  className="border-white/30 dark:border-white/20 text-white cursor-not-allowed opacity-75"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('dashboard.hero.view_pending', { count: pendingCount })}
                </Button>
              )}

              {/* Get Ready - Disabled/Informational only */}
              {hasPermission('productivity', 'view') && (
                <Button
                  variant="outline"
                  disabled
                  className="border-white/30 dark:border-white/20 text-white cursor-not-allowed opacity-75"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {t('dashboard.hero.get_ready')}
                </Button>
              )}

              {/* Team Chat - Disabled/Informational only */}
              {hasPermission('chat', 'view') && (
                <Button
                  variant="outline"
                  disabled
                  className="border-white/30 dark:border-white/20 text-white cursor-not-allowed opacity-75"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.hero.team_chat')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Metrics */}
        <DashboardMetrics />

        {/* Department Overview & Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <DepartmentOverview />
          </div>
          <div className="xl:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Quick Access Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {t('dashboard.quick_tools.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-3 hover:shadow-md transition-all"
                onClick={() => handleQuickAction(t('dashboard.quick_tools.vin_scanner'), '/vin-scanner')}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{t('dashboard.quick_tools.vin_scanner')}</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-3 hover:shadow-md transition-all"
                onClick={() => handleQuickAction(t('dashboard.quick_tools.nfc_tracking'), '/nfc-tracking')}
              >
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-sm font-medium">{t('dashboard.quick_tools.nfc_tracking')}</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-3 hover:shadow-md transition-all"
                onClick={() => handleQuickAction(t('dashboard.quick_tools.chat'), '/chat')}
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm font-medium">{t('dashboard.quick_tools.chat')}</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col gap-3 hover:shadow-md transition-all"
                onClick={() => handleQuickAction(t('dashboard.quick_tools.settings'), '/settings')}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{t('dashboard.quick_tools.settings')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 🧪 TESTING: SMS Button (Remover después de probar) */}
        <TestSMSButton />
    </div>
  );
}
