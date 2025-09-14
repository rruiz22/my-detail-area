import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { 
  Settings, 
  ShoppingCart, 
  Wrench, 
  RotateCcw, 
  Car, 
  BarChart3, 
  Users,
  Building2,
  Shield,
  MessageCircle,
  Package,
  Calendar
} from 'lucide-react';
import type { AppModule } from '@/hooks/usePermissions';

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
  chat: { name: 'Team Chat', description: 'team_communication', icon: MessageCircle, category: 'Communication' },
  reports: { name: 'Reports', description: 'access_reports_analytics', icon: BarChart3, category: 'Analytics' },
  settings: { name: 'Settings', description: 'system_configuration', icon: Shield, category: 'Administration' },
  dealerships: { name: 'Dealerships', description: 'manage_multiple_dealerships', icon: Building2, category: 'Administration' },
  users: { name: 'Users', description: 'user_management', icon: Users, category: 'Administration' },
  management: { name: 'Management', description: 'advanced_management_tools', icon: Shield, category: 'Administration' },
  productivity: { name: 'Productivity', description: 'task_calendar_productivity_tools', icon: Calendar, category: 'Operations' }
};

export const DealerModules: React.FC<DealerModulesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modules, setModules] = useState<DealershipModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchModules = async () => {
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
  };

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
  }, [dealerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dealer.modules.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div>
                    <div className="w-24 h-4 bg-muted rounded mb-1"></div>
                    <div className="w-32 h-3 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="w-12 h-6 bg-muted rounded-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('dealer.modules.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('dealer.modules.description')}
            </p>
          </CardHeader>
        </Card>

        {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{t(`dealer.modules.categories.${category.toLowerCase()}`)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryModules.map((module) => {
                  const config = moduleConfig[module.module];
                  const IconComponent = config?.icon || Settings;
                  
                  return (
                    <div key={module.module} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">
                              {config?.name || module.module}
                            </Label>
                            <Badge variant={module.is_enabled ? "default" : "secondary"} className="text-xs">
                              {module.is_enabled ? t('common.enabled') : t('common.disabled')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t(`dealer.modules.descriptions.${config?.description || module.module}`)}
                          </p>
                          {module.is_enabled && module.enabled_at && (
                            <p className="text-xs text-muted-foreground mt-1">
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