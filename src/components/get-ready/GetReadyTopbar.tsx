import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGetReadyVehiclesInfinite } from '@/hooks/useGetReadyVehicles';
import { NotificationBell } from '@/components/get-ready/notifications/NotificationBell';
// TODO: Create DeletedVehiclesDialog component
// import { DeletedVehiclesDialog } from '@/components/get-ready/DeletedVehiclesDialog';
import {
  Search,
  Settings,
  Grid3X3,
  Eye,
  UserCheck,
  Users,
  BarChart3,
  Wrench,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabConfig {
  key: string;
  icon: React.ElementType;
  path: string;
}

const TABS: TabConfig[] = [
  { key: 'overview', icon: Grid3X3, path: '/get-ready' },
  { key: 'details_view', icon: Eye, path: '/get-ready/details' },
  { key: 'approvals', icon: UserCheck, path: '/get-ready/approvals' },
  { key: 'vendors', icon: Users, path: '/get-ready/vendors' },
  { key: 'reports', icon: BarChart3, path: '/get-ready/reports' },
  { key: 'setup', icon: Wrench, path: '/get-ready/setup' }
];

export function GetReadyTopbar() {
  const { t } = useTranslation();
  const location = useLocation();
  // TODO: Uncomment when DeletedVehiclesDialog is created
  // const [showDeletedDialog, setShowDeletedDialog] = useState(false);

  // Get vehicles to count pending approvals (vehicles + work items)
  const { data: vehiclesData } = useGetReadyVehiclesInfinite({});
  const allVehicles = vehiclesData?.pages.flatMap(page => page.vehicles) ?? [];
  
  // Count vehicles needing approval
  const vehicleApprovalsCount = allVehicles.filter(
    v => v.requires_approval === true && v.approval_status === 'pending' && !v.approved_by
  ).length;
  
  // Count work items needing approval
  const workItemApprovalsCount = allVehicles.reduce((count, vehicle) => {
    // Check if work_items exists and is an array
    if (!vehicle.work_items || !Array.isArray(vehicle.work_items)) {
      return count;
    }
    
    const workItemsNeedingApproval = vehicle.work_items.filter(
      item => item.approval_required === true && !item.approval_status
    ).length;
    return count + workItemsNeedingApproval;
  }, 0);
  
  const pendingApprovalsCount = vehicleApprovalsCount + workItemApprovalsCount;
  const { user } = useAuth();

  // Filter tabs based on user role
  const visibleTabs = TABS.filter(tab => {
    // Hide Setup tab for non-system_admin users
    if (tab.key === 'setup' && user?.role !== 'system_admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="h-auto sm:h-12 border-b bg-gradient-to-r from-background to-muted/20 border-border/40 shadow-sm">
      <div className="h-full px-2 sm:px-4 py-2 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        {/* Left Section - Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
              (tab.path === '/get-ready' && location.pathname === '/get-ready');
            
            return (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t(`get_ready.tabs.${tab.key}`)}
                </span>
                {tab.key === 'approvals' && pendingApprovalsCount > 0 && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className={cn(
                      "ml-1 h-5 min-w-[20px] px-1.5 text-xs font-bold",
                      isActive
                        ? "bg-white/20 text-primary-foreground border-white/30"
                        : "bg-amber-100 text-amber-700 border-amber-300"
                    )}
                  >
                    {pendingApprovalsCount}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Right Section - Notifications & Settings */}
        <div className="flex items-center gap-2">
          {/* Notification Bell with real-time updates */}
          <NotificationBell size="md" />

          {/* TODO: Uncomment when DeletedVehiclesDialog is created */}
          {/* Deleted Vehicles Button */}
          {/* <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setShowDeletedDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('get_ready.deleted_vehicles')}</span>
          </Button> */}

          {/* Settings Button */}
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* TODO: Uncomment when DeletedVehiclesDialog is created */}
        {/* Deleted Vehicles Dialog */}
        {/* <DeletedVehiclesDialog
          open={showDeletedDialog}
          onOpenChange={setShowDeletedDialog}
        /> */}
      </div>
    </div>
  );
}