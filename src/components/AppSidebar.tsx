import React, { useState } from "react";
import { LayoutDashboard, ShoppingCart, Wrench, RefreshCw, Car, FileText, Settings, Bell, User, Users, ClipboardList, Building2, Shield, Users2, MessageCircle, QrCode, Nfc, Zap, Droplets, Package, Sparkles, Clock, Globe, Calendar } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useDealershipModules } from "@/hooks/useDealershipModules";
import { isSystemAdmin } from "@/utils/permissions";
import { LiveClock } from "@/components/ui/live-clock";
import { getSystemTimezone } from "@/utils/dateUtils";
export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const { enhancedUser, getAllowedOrderTypes, hasPermission } = usePermissions();
  const { t } = useTranslation();
  const location = useLocation();

  // Get user's dealership_id to check enabled modules
  const userDealershipId = (enhancedUser as any)?.dealership_id;
  const isAdmin = (enhancedUser as any)?.is_system_admin || false;

  // Load dealership modules (only if user has a dealership)
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(userDealershipId || 0);

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
        orderType: 'sales'
      },
      {
        title: t('navigation.service_orders'),
        url: "/service",
        icon: Wrench,
        orderType: 'service'
      },
      {
        title: t('navigation.recon_orders'),
        url: "/recon",
        icon: RefreshCw,
        orderType: 'recon'
      },
      {
        title: t('navigation.car_wash'),
        url: "/carwash",
        icon: Droplets,
        orderType: 'carwash'
      }
    ];

    // Filter items based on user's allowed order types
    return baseItems.filter(item =>
      item.orderType === null ||
      allowedOrderTypes.includes(item.orderType as any) ||
      enhancedUser?.role === 'system_admin'
    );
  }, [t, getAllowedOrderTypes, enhancedUser?.role]);

  // Workflow Management
  const workflowNavItems = React.useMemo(() => {
    const baseItems = [{
      title: t('navigation.get_ready'),
      url: "/get-ready",
      icon: Zap,
      module: 'productivity' as const
    }, {
      title: t('navigation.stock'),
      url: "/stock",
      icon: Package,
      module: 'stock' as const
    }, {
      title: t('navigation.detail_hub'),
      url: "/detail-hub",
      icon: Clock,
      module: 'productivity' as const
    }];

    // Filter by permissions AND dealer enabled modules
    // Security: Two-layer validation ensures proper access control:
    // 1. hasPermission() - Role-based permissions (ALWAYS checked first - primary security layer)
    // 2. hasModuleAccess() - Dealership module configuration (defaults to true if not configured)
    // This allows new dealerships without explicit module config to function normally,
    // while still enforcing strict role-based permissions for all users
    return baseItems.filter(item =>
      hasPermission(item.module, 'view') &&
      (isAdmin || hasModuleAccess(item.module))
    );
  }, [t, hasPermission, isAdmin, hasModuleAccess]);

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

  // Productivity
  const productivityNavItems = React.useMemo(() => {
    const baseItems = [{
      title: t('navigation.productivity'),
      url: "/productivity",
      icon: Calendar,
      module: 'productivity' as const
    }, {
      title: t('profile.title'),
      url: "/profile",
      icon: User,
      module: null // Profile always accessible
    }];

    // Filter by permissions AND dealer enabled modules (except Profile which is always accessible)
    return baseItems.filter(item =>
      !item.module ||
      (hasPermission(item.module, 'view') && (isAdmin || hasModuleAccess(item.module)))
    );
  }, [t, hasPermission, isAdmin, hasModuleAccess]);

  // Management & Reports - Filtered by permissions
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
      }
    ];

    // Filter by permissions AND dealer enabled modules
    return baseItems.filter(item =>
      hasPermission(item.module, item.permission) &&
      (isAdmin || hasModuleAccess(item.module))
    );
  }, [t, hasPermission, isAdmin, hasModuleAccess]);

  // System Admin - only navigation items
  const systemAdminNavItems = React.useMemo(() => {
    if (enhancedUser?.role !== 'system_admin') return [];

    return [
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
  }, [enhancedUser?.role, t]);
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  

  const handleNavClick = (url?: string) => {
    // Close mobile sidebar on navigation
    if (window.innerWidth < 768) {
      setOpen(false);
    }
    if (url) {
      console.log('[Sidebar] navigating to ->', url);
      // Force a small delay to ensure state updates properly
      setTimeout(() => {
        console.log('[Sidebar] navigation completed to ->', url);
      }, 100);
    }
  };
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
    <Sidebar collapsible="icon" className="border-r z-50" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
      <SidebarHeader className="p-4 space-y-3">
        {/* Logo/Title (First Row) */}
        <div className="flex items-center justify-center">
          {collapsed ? (
            <div className="font-bold text-lg text-primary">MDA</div>
          ) : (
            <div className="text-center">
              <h1 className="font-bold text-lg">My Detail Area</h1>
              <p className="text-[9px] text-muted-foreground">Enterprise Dealership Management</p>
            </div>
          )}
        </div>

        {/* Live Clock - Eastern Time (Second Row) */}
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
                  {collapsed ? (
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
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workflow Management - Only show if has items */}
        {workflowNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.workflow_management')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workflowNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed ? (
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
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tools & Communication - Only show if has items */}
        {toolsNavItems.length > 0 && (
          <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.tools_communication')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed ? (
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
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Productivity - Only show if has items */}
        {productivityNavItems.length > 0 && (
          <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.productivity_section')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {productivityNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed ? (
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
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administration & Reports - Only show if has items */}
        {managementNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.administration_reports')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  {collapsed ? (
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
                        <span>{item.title}</span>
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
                    {collapsed ? (
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
                          <span>{item.title}</span>
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
  );
}