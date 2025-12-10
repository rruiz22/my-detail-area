import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { AppModule } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import {
    BarChart3,
    Building2,
    Calendar,
    Car,
    MessageCircle,
    Nfc,
    Package,
    RotateCcw,
    ScanLine,
    Settings,
    Shield,
    ShoppingCart,
    Users,
    Users2,
    Wrench,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealerModulesProps {
  dealerId: string;
}

interface DealershipModule {
  module: AppModule;
  is_enabled: boolean;
  enabled_at: string;
  enabled_by: string | null;
}

const moduleConfig: Record<AppModule, { name: string; description: string; icon: React.ComponentType; category: string }> = {
  dashboard: { name: 'Dashboard', description: 'main_dashboard', icon: BarChart3, category: 'Core' },
  sales_orders: { name: 'Sales Orders', description: 'manage_sales_orders', icon: ShoppingCart, category: 'Orders' },
  service_orders: { name: 'Service Orders', description: 'manage_service_orders', icon: Wrench, category: 'Orders' },
  recon_orders: { name: 'Recon Orders', description: 'manage_recon_orders', icon: RotateCcw, category: 'Orders' },
  car_wash: { name: 'Car Wash', description: 'manage_car_wash_orders', icon: Car, category: 'Orders' },
  stock: { name: 'Stock/Inventory', description: 'manage_vehicle_inventory', icon: Package, category: 'Orders' },
  get_ready: { name: 'Get Ready', description: 'vehicle_preparation_workflow', icon: Zap, category: 'Operations' },
  chat: { name: 'Team Chat', description: 'team_communication', icon: MessageCircle, category: 'Communication' },
  contacts: { name: 'Contacts', description: 'customer_contact_management', icon: Users2, category: 'Communication' },
  reports: { name: 'Reports', description: 'access_reports_analytics', icon: BarChart3, category: 'Analytics' },
  settings: { name: 'Settings', description: 'system_configuration', icon: Shield, category: 'Administration' },
  dealerships: { name: 'Dealerships', description: 'manage_multiple_dealerships', icon: Building2, category: 'Administration' },
  users: { name: 'Users', description: 'user_management', icon: Users, category: 'Administration' },
  management: { name: 'Management', description: 'advanced_management_tools', icon: Shield, category: 'Administration' },
  productivity: { name: 'Productivity', description: 'task_calendar_productivity_tools', icon: Calendar, category: 'Operations' },
  detail_hub: { name: 'Detail Hub', description: 'employee_portal_timecards', icon: Users, category: 'Operations' },
  vin_scanner: { name: 'VIN Scanner', description: 'advanced_vin_scanning_ocr_camera', icon: ScanLine, category: 'Tools' },
  nfc_tracking: { name: 'NFC Tracking', description: 'vehicle_tracking_nfc_tags_workflows', icon: Nfc, category: 'Tools' }
};

export const DealerModules: React.FC<DealerModulesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modules, setModules] = useState<DealershipModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_dealership_modules', {
        p_dealer_id: parseInt(dealerId)
      });

      if (error) throw error;

      // Create a complete list with all modules, filling missing ones as disabled
      const allModules: DealershipModule[] = Object.keys(moduleConfig).map((module) => {
        const existingModule = data?.find((m: DealershipModule) => m.module === module);
        return existingModule || {
          module: module as AppModule,
          is_enabled: false,
          enabled_at: new Date().toISOString(),
          enabled_by: null
        };
      });

      setModules(allModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.modules.fetch_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  const toggleModule = async (module: AppModule, currentEnabled: boolean) => {
    try {
      setUpdating(module);
      const { error } = await supabase.rpc('update_dealership_module', {
        p_dealer_id: parseInt(dealerId),
        p_module: module,
        p_is_enabled: !currentEnabled
      });

      if (error) throw error;

      // Update local state
      setModules(prev => prev.map(m =>
        m.module === module
          ? { ...m, is_enabled: !currentEnabled, enabled_at: new Date().toISOString() }
          : m
      ));

      toast({
        title: t('common.success'),
        description: !currentEnabled
          ? t('dealer.modules.module_enabled', { module: moduleConfig[module].name })
          : t('dealer.modules.module_disabled', { module: moduleConfig[module].name })
      });
    } catch (error) {
      console.error('Error updating module:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.modules.update_error'),
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="w-32 h-6 bg-muted rounded mb-1.5 animate-pulse"></div>
                <div className="w-64 h-4 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Cards */}
        {[1, 2].map((cardIndex) => (
          <Card key={cardIndex} className="border shadow-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b py-4">
              <div className="flex items-center justify-between">
                <div className="w-24 h-5 bg-muted rounded animate-pulse"></div>
                <div className="w-20 h-5 bg-muted rounded-full animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-5 border rounded-xl animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-xl"></div>
                      <div>
                        <div className="w-32 h-4 bg-muted rounded mb-2"></div>
                        <div className="w-48 h-3 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-muted rounded-full"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Group modules by category
  const modulesByCategory = modules.reduce((acc, module) => {
    const category = moduleConfig[module.module]?.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, DealershipModule[]>);

  return (
    <PermissionGuard module="management" permission="admin" fallback={
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">{t('common.access_denied')}</p>
        </CardContent>
      </Card>
    }>
      <div className="space-y-6">
        {/* Professional Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('dealer.modules.title')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('dealer.modules.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
          <Card key={category} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900">
                  {t(`dealer.modules.categories.${category.toLowerCase()}`)}
                </CardTitle>
                <Badge variant="secondary" className="bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300 font-semibold">
                  {categoryModules.length} {categoryModules.length === 1 ? 'module' : 'modules'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {categoryModules.map((module) => {
                  const config = moduleConfig[module.module];
                  const IconComponent = config?.icon || Settings;

                  return (
                    <div
                      key={module.module}
                      className="flex items-center justify-between p-5 border rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5">
                            <Label className="text-sm font-semibold text-gray-900 cursor-pointer">
                              {t(`dealer.modules.names.${module.module}`)}
                            </Label>
                            <Badge
                              className={
                                module.is_enabled
                                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5 font-semibold"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200 text-xs px-2.5 py-0.5 font-semibold"
                              }
                            >
                              {module.is_enabled ? t('common.enabled') : t('common.disabled')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                            {t(`dealer.modules.descriptions.${config?.description || module.module}`)}
                          </p>
                          {module.is_enabled && module.enabled_at && (
                            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              {t('dealer.modules.enabled_on', {
                                date: new Date(module.enabled_at).toLocaleDateString()
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <Switch
                        checked={module.is_enabled}
                        disabled={updating === module.module}
                        onCheckedChange={() => toggleModule(module.module, module.is_enabled)}
                        className="ml-4"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGuard>
  );
};
