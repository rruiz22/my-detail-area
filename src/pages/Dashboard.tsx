import dealershipHero from "@/assets/dealership-hero.jpg";
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { DepartmentOverview } from '@/components/dashboard/DepartmentOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ModuleStatusCards } from '@/components/dashboard/ModuleStatusCards';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNotifications } from "@/hooks/useNotifications";
import { usePermissions } from '@/hooks/usePermissions';
import { useSenderInfo } from '@/hooks/useSenderInfo';
import * as logger from '@/utils/logger';
import { AlertTriangle, Clock, MessageCircle, Plus, Zap, Shield, User, Mail } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function Dashboard() {
  logger.dev('🟢 Dashboard component is RENDERING');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { data: dashboardData } = useDashboardData();
  const { hasPermission } = usePermissions();
  const { data: senderInfo } = useSenderInfo();

  const pendingCount = dashboardData?.overall.pendingOrders || 0;

  // Check if user has access to any order modules
  const hasAnyModuleAccess = useMemo(() => {
    return (
      hasPermission('sales_orders', 'view') ||
      hasPermission('service_orders', 'view') ||
      hasPermission('recon_orders', 'view') ||
      hasPermission('car_wash', 'view')
    );
  }, [hasPermission]);

  // Empty state - No module access
  if (!hasAnyModuleAccess) {
    return (
      <div className="space-y-8">
        {/* Hero Section - Still show branding */}
        <div className="relative overflow-hidden rounded-xl bg-gray-900 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: `url(${dealershipHero})`
          }} />
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
              {t('dashboard.hero.welcome_to')} {senderInfo?.company_name || 'My Detail Area'}
            </h1>
            <p className="text-lg sm:text-xl text-white/90">{t('dashboard.hero.subtitle')}</p>
          </div>
        </div>

        {/* Empty State Card */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-xl">{t('dashboard.empty_state.no_access_title')}</CardTitle>
            <CardDescription className="text-base">
              {t('dashboard.empty_state.no_access_message')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">{t('dashboard.empty_state.contact_admin')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-1">📊 {t('dashboard.departments.sales')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.empty_state.sales_module')}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-1">🔧 {t('dashboard.departments.service')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.empty_state.service_module')}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-1">🔄 {t('dashboard.departments.recon')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.empty_state.recon_module')}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-1">💧 {t('dashboard.departments.car_wash')}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.empty_state.carwash_module')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t">
              <Button variant="default" onClick={() => navigate('/settings')}>
                <User className="w-4 h-4 mr-2" />
                {t('dashboard.empty_state.view_profile')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/settings')}>
                <Mail className="w-4 h-4 mr-2" />
                {t('dashboard.empty_state.contact_support')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
              {t('dashboard.hero.welcome_to')} {senderInfo?.company_name || 'My Detail Area'}
            </h1>
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

        {/* Module Status Cards - Quick overview of accessible modules */}
        <ModuleStatusCards />

        {/* Quick Actions - Permission-based actions */}
        <QuickActions />

        {/* Department Overview & Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <DepartmentOverview />
          </div>
          <div className="xl:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Team Performance - Activity in accessible modules */}
        <TeamPerformance />
    </div>
  );
}
