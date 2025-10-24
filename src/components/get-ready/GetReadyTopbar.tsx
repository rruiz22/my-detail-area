import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useGetReadyApprovalCount } from '@/hooks/useGetReadyApprovalCount';
import { NotificationBell } from '@/components/get-ready/notifications/NotificationBell';
import { DeletedVehiclesDialog } from '@/components/get-ready/DeletedVehiclesDialog';
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
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);

  // Get accurate count of vehicles needing approval (optimized query)
  const { data: pendingApprovalsCount = 0 } = useGetReadyApprovalCount();

  const { hasModulePermission } = usePermissions();

  // Filter tabs based on granular permissions
  const visibleTabs = TABS.filter(tab => {
    // Hide Setup tab if user doesn't have access_setup permission
    if (tab.key === 'setup') {
      return hasModulePermission('get_ready', 'access_setup');
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

          {/* Deleted Vehicles Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setShowDeletedDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('get_ready.deleted_vehicles.title')}</span>
          </Button>

          {/* Settings Button */}
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Deleted Vehicles Dialog */}
        <DeletedVehiclesDialog
          open={showDeletedDialog}
          onOpenChange={setShowDeletedDialog}
        />
      </div>
    </div>
  );
}