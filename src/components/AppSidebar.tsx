import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LiveClock } from "@/components/ui/live-clock";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import { useGlobalChat } from "@/contexts/GlobalChatProvider";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { useDealershipModules } from "@/hooks/useDealershipModules";
import { usePermissions } from "@/hooks/usePermissions";
import { getSystemTimezone } from "@/utils/dateUtils";
import { Building2, Calendar, Clock, Droplets, FileText, Globe, LayoutDashboard, Megaphone, MessageCircle, Nfc, Package, QrCode, Receipt, RefreshCw, Settings, Shield, ShoppingCart, Sparkles, User, Users2, Wrench, Zap } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import * as logger from "@/utils/logger";

export function AppSidebar() {
  const { state, open, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar();
  const { enhancedUser, getAllowedOrderTypes, hasPermission } = usePermissions();
  const { t } = useTranslation();
  const location = useLocation();
  const { selectedDealerId } = useDealerFilter();

  // Get chat unread count
  const { totalUnreadCount } = useGlobalChat();

  // Get current dealership for logo display
  const { currentDealership } = useAccessibleDealerships();

  // Debug logging for currentDealership changes
  React.useEffect(() => {
    logger.dev('🏢 [AppSidebar] currentDealership changed:', {
      name: currentDealership?.name || 'null',
      id: currentDealership?.id || 'null',
      hasLogo: !!currentDealership?.logo_url,
      hasThumbnail: !!currentDealership?.thumbnail_logo_url,
      logoUrl: currentDealership?.logo_url || 'null',
      thumbnailUrl: currentDealership?.thumbnail_logo_url || 'null'
    });
  }, [currentDealership]);

  // Use global filter instead of user's dealership_id for module checking
  // This allows multi-dealer users to see correct sidebar items based on selected dealer
  const activeDealerId = typeof selectedDealerId === 'number' ? selectedDealerId : enhancedUser?.dealership_id || 0;

  // Check if user is system admin (works for both EnhancedUser and EnhancedUserV2)
  const isAdmin = enhancedUser
    ? ('is_system_admin' in enhancedUser
        ? enhancedUser.is_system_admin
        : enhancedUser.role === 'system_admin')
    : false;

  // Load dealership modules for the currently selected dealer
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(activeDealerId);

  // Core Operations - Filtered by user's allowed order types
  const coreNavItems = React.useMemo(() => {
    const allowedOrderTypes = getAllowedOrderTypes();
    const baseItems = [
      {
        title: t('navigation.dashboard'),
        url: "/dashboard",
        icon: LayoutDashboard,
        orderType: null // Dashboard is always accessible
      },
      {
        title: t('navigation.sales_orders'),
        url: "/sales",
        icon: ShoppingCart,
        orderType: 'sales',
        module: 'sales_orders' as const
      },
      {
        title: t('navigation.service_orders'),
        url: "/service",
        icon: Wrench,
        orderType: 'service',
        module: 'service_orders' as const
      },
      {
        title: t('navigation.recon_orders'),
        url: "/recon",
        icon: RefreshCw,
        orderType: 'recon',
        module: 'recon_orders' as const
      },
      {
        title: t('navigation.car_wash'),
        url: "/carwash",
        icon: Droplets,
        orderType: 'carwash',
        module: 'car_wash' as const
      },
      {
        title: t('navigation.get_ready'),
        url: "/get-ready",
        icon: Zap,
        orderType: null, // Accessible based on module permissions
        module: 'get_ready' as const
      },
      {
        title: t('navigation.stock'),
        url: "/stock",
        icon: Package,
        orderType: null, // Accessible based on module permissions
        module: 'stock' as const
      },
      {
        title: t('navigation.detail_hub'),
        url: "/detail-hub",
        icon: Clock,
        orderType: null, // Accessible based on module permissions
        module: 'productivity' as const
      },
      {
        title: t('navigation.productivity'),
        url: "/productivity",
        icon: Calendar,
        orderType: null, // Accessible based on module permissions
        module: 'productivity' as const
      }
    ];

    // Filter items based on user's allowed order types AND module permissions
    // Items with orderType: null will always pass the orderType check
    // Items with module property will be filtered by hasPermission and hasModuleAccess
    return baseItems.filter(item => {
      // First check order type permissions
      const hasOrderTypeAccess = item.orderType === null ||
        (item.orderType !== null && allowedOrderTypes.includes(item.orderType)) ||
        enhancedUser?.role === 'system_admin';

      // If item has a module property, also check module permissions
      if ('module' in item && item.module) {
        return hasOrderTypeAccess &&
          hasPermission(item.module, 'view') &&
          (isAdmin || hasModuleAccess(item.module));
      }

      return hasOrderTypeAccess;
    });
  }, [t, getAllowedOrderTypes, enhancedUser?.role, hasPermission, isAdmin, hasModuleAccess]);

  // Workflow Management section removed - items moved to Core Operations

  // Tools & Communication
  const toolsNavItems = React.useMemo(() => {
    const baseItems = [{
      title: t('chat.title'),
      url: "/chat",
      icon: MessageCircle,
      module: 'chat' as const
    }, {
      title: t('contacts.title'),
      url: "/contacts",
      icon: Users2,
      module: 'contacts' as const
    }, {
      title: t('vin_scanner_hub.title'),
      url: "/vin-scanner",
      icon: QrCode,
      module: 'productivity' as const
    }, {
      title: t('nfc_tracking.title'),
      url: "/nfc-tracking",
      icon: Nfc,
      module: 'productivity' as const
    }];

    // Filter by permissions AND dealer enabled modules
    return baseItems.filter(item =>
      hasPermission(item.module, 'view') &&
      (isAdmin || hasModuleAccess(item.module))
    );
  }, [t, hasPermission, isAdmin, hasModuleAccess]);

  // Productivity section removed - items moved to Core Operations and Management

  // Management - Filtered by permissions
  const managementNavItems = React.useMemo(() => {
    const baseItems = [
      {
        title: t('admin.administration'),
        url: "/admin",
        icon: Shield,
        module: 'management' as const,
        permission: 'admin' as const,
        description: t('admin.administration_description')
      },
      {
        title: t('navigation.reports'),
        url: "/reports",
        icon: FileText,
        module: 'reports' as const,
        permission: 'view' as const
      },
      {
        title: t('navigation.settings'),
        url: "/settings",
        icon: Settings,
        module: 'settings' as const,
        permission: 'view' as const
      },
      {
        title: t('profile.title'),
        url: "/profile",
        icon: User,
        module: null, // Profile always accessible
        permission: 'view' as const
      }
    ];

    // Filter by permissions AND dealer enabled modules
    // Profile (module: null) is always accessible
    return baseItems.filter(item => {
      if (!item.module) return true; // Profile always accessible
      return hasPermission(item.module, item.permission) &&
        (isAdmin || hasModuleAccess(item.module));
    });
  }, [t, hasPermission, isAdmin, hasModuleAccess]);

  // System Admin - only navigation items
  const systemAdminNavItems = React.useMemo(() => {
    // Use same logic as isAdmin check to ensure consistency
    if (!isAdmin) return [];

    return [
      {
        title: t('announcements.title', 'Announcements'),
        url: "/announcements",
        icon: Megaphone
      },
      {
        title: t('navigation.landing_page'),
        url: "/landing",
        icon: Globe
      },
      {
        title: 'Phase 3 Dashboard',
        url: "/phase3",
        icon: Sparkles
      }
    ];
  }, [isAdmin, t]);
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";


  const handleNavClick = React.useCallback(() => {
    // Close mobile sidebar on navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };
  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return active ? "bg-primary text-primary-foreground font-medium shadow-sm" : "hover:bg-muted/50 transition-colors";
  };
  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon" className="border-r z-50" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
        <SidebarHeader className="sticky top-0 z-10 bg-sidebar px-4 pt-3 pb-2 space-y-0.5 border-b border-border/40">
        {/* 1️⃣ Dealership Logo (First Row) */}
        {currentDealership && (
          <div className="flex flex-col items-center gap-1 py-2 border-y border-border/40">
            {/* Dealership Avatar */}
            <Avatar className={collapsed ? "h-10 w-10" : "h-16 w-16"}>
              <AvatarImage
                src={currentDealership.thumbnail_logo_url || currentDealership.logo_url || ''}
                alt={currentDealership.name}
                loading="lazy"
              />
              <AvatarFallback className="bg-muted">
                <Building2 className={collapsed ? "h-5 w-5" : "h-8 w-8 text-muted-foreground"} />
              </AvatarFallback>
            </Avatar>

            {/* Dealership Name (only when expanded) */}
            {!collapsed && (
              <div className="text-center px-2 max-w-full">
                <p className="text-sm font-bold truncate" title={currentDealership.name}>
                  {currentDealership.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2️⃣ Live Clock - Eastern Time (Second Row) */}
        <div className="flex justify-center">
          <LiveClock
            className={collapsed ? "scale-75" : "text-base"}
            showIcon={false}
            showDate={true}
            timezone={getSystemTimezone()}
            format24h={false}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.core_operations')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed && !isMobile ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                         <NavLink
                            to={item.url}
                            onClick={handleNavClick}
                            className={`${getNavClasses(item.url)} sidebar-icon-centered`}
                          >
                            <item.icon className="w-4 h-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                       <NavLink
                        to={item.url}
                        onClick={handleNavClick}
                        className={getNavClasses(item.url)}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools & Communication - Only show if has items */}
        {toolsNavItems.length > 0 && (
          <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.tools_communication')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map(item => {
                // Check if this is the Team Chat item
                const isChatItem = item.url === '/chat';
                const showBadge = isChatItem && totalUnreadCount > 0;

                return (
                  <SidebarMenuItem key={item.title}>
                    {collapsed && !isMobile ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              onClick={handleNavClick}
                              className={`${getNavClasses(item.url)} sidebar-icon-centered relative`}
                            >
                              <item.icon className="w-4 h-4" />
                              {showBadge && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] flex items-center justify-center"
                                >
                                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                </Badge>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                          {showBadge && (
                            <p className="text-xs text-muted-foreground">
                              {totalUnreadCount} unread
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          onClick={handleNavClick}
                          className={getNavClasses(item.url)}
                        >
                          <div className="relative">
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {showBadge && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full text-[9px] flex items-center justify-center"
                              >
                                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                              </Badge>
                            )}
                          </div>
                          {!collapsed && (
                            <span className="flex items-center gap-2">
                              {item.title}
                              {showBadge && (
                                <Badge
                                  variant="destructive"
                                  className="ml-auto h-5 min-w-5 px-1.5 rounded-full text-[10px]"
                                >
                                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                </Badge>
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administration - Only show if has items */}
        {managementNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.administration')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed && !isMobile ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                           <NavLink
                            to={item.url}
                            onClick={handleNavClick}
                            className={`${getNavClasses(item.url)} sidebar-icon-centered`}
                          >
                            <item.icon className="w-4 h-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                       <NavLink
                        to={item.url}
                        onClick={handleNavClick}
                        className={getNavClasses(item.url)}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* System Administration */}
        {systemAdminNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.system_admin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemAdminNavItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    {collapsed && !isMobile ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                             <NavLink
                              to={item.url}
                              className={`${getNavClasses(item.url)} sidebar-icon-centered`}
                            >
                              <item.icon className="w-4 h-4" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                         <NavLink
                          to={item.url}
                          className={getNavClasses(item.url)}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}
