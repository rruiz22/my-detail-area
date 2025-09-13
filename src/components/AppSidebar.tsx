import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Wrench, RefreshCw, Car, FileText, Settings, Bell, User, Users, ClipboardList, Building2, LogOut, Shield, Users2, MessageCircle, QrCode, Nfc, Zap, Droplets, Package, Sparkles, Clock, Globe, Calendar } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { isSystemAdmin } from "@/utils/permissions";
export function AppSidebar() {
  const { state, open } = useSidebar();
  const { user, signOut } = useAuth();
  const { roles } = usePermissions();
  const { t } = useTranslation();
  const location = useLocation();

  // Core Operations
  const coreNavItems = [{
    title: t('navigation.dashboard'),
    url: "/dashboard",
    icon: LayoutDashboard
  }, {
    title: t('navigation.sales_orders'),
    url: "/sales",
    icon: ShoppingCart
  }, {
    title: t('navigation.service_orders'),
    url: "/service",
    icon: Wrench
  }, {
    title: t('navigation.recon_orders'),
    url: "/recon",
    icon: RefreshCw
  }, {
    title: t('navigation.car_wash'),
    url: "/carwash",
    icon: Droplets
  }];

  // Workflow Management
  const workflowNavItems = [{
    title: t('navigation.get_ready'),
    url: "/get-ready",
    icon: Zap
  }, {
    title: t('navigation.stock'),
    url: "/stock",
    icon: Package
  }, {
    title: t('navigation.detail_hub'),
    url: "/detail-hub",
    icon: Clock
  }];

  // Tools & Communication
  const toolsNavItems = [{
    title: t('chat.title'),
    url: "/chat",
    icon: MessageCircle
  }, {
    title: t('contacts.title'),
    url: "/contacts",
    icon: Users2
  }, {
    title: t('vin_scanner_hub.title'),
    url: "/vin-scanner",
    icon: QrCode
  }, {
    title: t('nfc_tracking.title'),
    url: "/nfc-tracking",
    icon: Nfc
  }];

  // Productivity
  const productivityNavItems = [{
    title: t('navigation.productivity'),
    url: "/productivity",
    icon: Calendar
  }, {
    title: t('profile.title'),
    url: "/profile",
    icon: User
  }];

  // Management & Reports
  const managementNavItems = [{
    title: t('dealerships.title'),
    url: "/dealerships",
    icon: Building2
  }, {
    title: t('navigation.management'),
    url: "/management",
    icon: Shield
  }, {
    title: t('pages.user_management'),
    url: "/users",
    icon: Users
  }, {
    title: t('navigation.reports'),
    url: "/reports",
    icon: FileText
  }, {
    title: t('navigation.settings'),
    url: "/settings",
    icon: Settings
  }];

  // System Admin - only navigation items
  const systemAdminNavItems = isSystemAdmin(roles) ? [{
    title: t('navigation.landing_page'),
    url: "/landing",
    icon: Globe
  }, {
    title: 'Phase 3 Dashboard',
    url: "/phase3",
    icon: Sparkles
  }] : [];
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const handleSignOut = async () => {
    await signOut();
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
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          {collapsed ? (
            <div className="font-bold text-lg text-primary">MDA</div>
          ) : (
            <div>
              <h1 className="font-bold text-xl">My Detail Area</h1>
              <p className="text-[10px] text-muted-foreground">Enterprise Dealership Management</p>
            </div>
          )}
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

        {/* Workflow Management */}
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

        {/* Tools & Communication */}
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

        {/* Productivity */}
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

        {/* Management & Reports */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>{t('navigation.management_reports')}</SidebarGroupLabel>
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

      <SidebarFooter className="p-4">
        <div className="space-y-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut} 
                className="w-8 h-8 p-0 flex items-center justify-center"
                title={t('navigation.sign_out')}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut} 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                {t('navigation.sign_out')}
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}