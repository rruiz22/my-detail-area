import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, CheckCircle, AlertCircle, DollarSign, Plus, Users, Settings, BarChart3, Zap } from "lucide-react";
import { getDashboardMetrics, mockOrders } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { useNotifications } from "@/components/NotificationProvider";
import dealershipHero from "@/assets/dealership-hero.jpg";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { DepartmentOverview } from '@/components/dashboard/DepartmentOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
export default function Dashboard() {
  console.log('🟢 Dashboard component is RENDERING');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const metrics = getDashboardMetrics();
  const recentOrders = mockOrders.slice(0, 5);
  const notifications = useNotifications();
  
  const handleQuickAction = (action: string, route?: string) => {
    notifications.showSuccess(t('dashboard.actions.success', { action }), t('dashboard.actions.started'));
    if (route) {
      navigate(route);
    }
  };
  return (
    <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-primary p-8 text-primary-foreground">
          <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{
            backgroundImage: `url(${dealershipHero})`
          }} />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{t('dashboard.hero.welcome')}</h1>
            <p className="text-xl opacity-90">{t('dashboard.hero.subtitle')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button 
                variant="secondary" 
                onClick={() => handleQuickAction(t('dashboard.actions.create_order'), '/vin-scanner')}
                className="button-enhanced"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.actions.create_order')}
              </Button>
              <Button 
                variant="outline" 
                className="border-white/20 text-primary-foreground hover:bg-white/10"
                onClick={() => handleQuickAction(t('dashboard.actions.view_reports'), '/reports')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('dashboard.actions.view_reports')}
              </Button>
              <Button 
                variant="outline" 
                className="border-white/20 text-primary-foreground hover:bg-white/10"
                onClick={() => handleQuickAction(t('dashboard.actions.manage_users'), '/users')}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('dashboard.actions.manage_users')}
              </Button>
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
    </div>
  );
}