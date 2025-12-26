import { DeletedVehiclesDialog } from '@/components/get-ready/DeletedVehiclesDialog';
import { NotificationBell } from '@/components/get-ready/notifications/NotificationBell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetReadyApprovalCount } from '@/hooks/useGetReadyApprovalCount';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
    Activity,
    BarChart3,
    Eye,
    Grid3X3,
    Settings,
    Trash2,
    UserCheck,
    Users,
    Wrench
} from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

interface TabConfig {
  key: string;
  icon: React.ElementType;
  path: string;
}

const TABS: TabConfig[] = [
  { key: 'overview', icon: Grid3X3, path: '/get-ready/overview' },
  { key: 'steps', icon: Eye, path: '/get-ready/details' },
  { key: 'approvals', icon: UserCheck, path: '/get-ready/approvals' },
  { key: 'vendors', icon: Users, path: '/get-ready/vendors' },
  { key: 'reports', icon: BarChart3, path: '/get-ready/reports' },
  { key: 'activity', icon: Activity, path: '/get-ready/activity' },
  { key: 'setup', icon: Wrench, path: '/get-ready/setup' }
];

export function GetReadyTopbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

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

  // Handle scroll indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
    };

    updateScrollIndicators();
    container.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);

    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [visibleTabs]);

  return (
    <TooltipProvider>
      <div className="h-12 border-b bg-gradient-to-r from-background to-muted/20 border-border/40 shadow-sm">
        <div className="h-full px-2 sm:px-4 flex items-center justify-between gap-2">
          {/* Left Section - Navigation Tabs with scroll */}
          <div className="relative flex-1 min-w-0">
            {/* Left fade indicator */}
            {showLeftFade && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            )}

            {/* Scrollable tabs container */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path ||
                  (tab.path === '/get-ready' && location.pathname === '/get-ready');

                return (
                  <Tooltip key={tab.key}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={tab.path}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 snap-start",
                          "min-w-[40px] sm:min-w-0 justify-center sm:justify-start",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden md:inline truncate">
                          {t(`get_ready.tabs.${tab.key}`)}
                        </span>
                        {tab.key === 'approvals' && pendingApprovalsCount > 0 && (
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className={cn(
                              "h-5 min-w-[20px] px-1.5 text-xs font-bold flex-shrink-0",
                              isActive
                                ? "bg-white/20 text-primary-foreground border-white/30"
                                : "bg-amber-100 text-amber-700 border-amber-300"
                            )}
                          >
                            {pendingApprovalsCount}
                          </Badge>
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="md:hidden">
                      {t(`get_ready.tabs.${tab.key}`)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Right fade indicator */}
            {showRightFade && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            )}
          </div>

          {/* Right Section - Notifications & Settings */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Notification Bell with real-time updates */}
            <NotificationBell size="md" />

            {/* Deleted Vehicles Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 sm:w-auto sm:h-9 p-0 sm:px-3"
                  onClick={() => setShowDeletedDialog(true)}
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('get_ready.deleted_vehicles.title')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {t('get_ready.deleted_vehicles.title')}
              </TooltipContent>
            </Tooltip>

            {/* Settings Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 h-8 w-8 sm:h-9 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('common.settings')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Deleted Vehicles Dialog */}
        <DeletedVehiclesDialog
          open={showDeletedDialog}
          onOpenChange={setShowDeletedDialog}
        />
      </div>
    </TooltipProvider>
  );
}
