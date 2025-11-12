import { PrivacyPolicyModal } from "@/components/legal/PrivacyPolicyModal";
import { TermsOfServiceModal } from "@/components/legal/TermsOfServiceModal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version/VersionDisplay";
import { UpdateBanner } from "@/components/version/UpdateBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { useCurrentYear } from "@/hooks/useCurrentYear";
import { Menu, Search } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AnnouncementBanner } from "./announcements/AnnouncementBanner";
import { AppSidebar } from "./AppSidebar";
import { DealershipFilter } from "./filters/DealershipFilter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Breadcrumbs } from "./navigation/Breadcrumbs";
import { NotificationBell } from "./notifications/NotificationBell";
import { OnlineUsersIndicator } from "./presence/OnlineUsersIndicator";
import { GlobalSearch } from "./search/GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";
import { UserDropdown } from "./ui/user-dropdown";
import * as logger from "@/utils/logger";

interface ProtectedLayoutProps {
  children?: ReactNode;
  title?: string;
}

// Inner component that has access to useSidebar hook
const ProtectedLayoutInner = ({ children, title }: ProtectedLayoutProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const { open, setOpen } = useSidebar();
  const previousPathRef = useRef<string>('');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const currentYear = useCurrentYear();

  // ✅ OPTIMIZATION: Auto-collapse/expand sidebar for Get Ready module
  // Immediate state update without setTimeout for better performance
  useEffect(() => {
    const isGetReadyModule = location.pathname.startsWith('/get-ready');
    const wasGetReadyModule = previousPathRef.current.startsWith('/get-ready');

    // Only act if module state changed (entering or leaving Get Ready)
    if (isGetReadyModule !== wasGetReadyModule) {
      const targetState = !isGetReadyModule;
      logger.dev(`🔧 [PROTECTED LAYOUT] ${isGetReadyModule ? 'Entering' : 'Leaving'} Get Ready - ${targetState ? 'Opening' : 'Collapsing'} sidebar`);

      // Immediate update - CSS transition handles animation smoothly
      setOpen(targetState);
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname, setOpen]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Sticky Header */}
          <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 flex items-center justify-between px-4 md:px-6" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
            {/* Left Section */}
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="flex-shrink-0" />
              {/* Desktop: Full search bar */}
              <div className="hidden md:block md:w-80 lg:w-96">
                <GlobalSearch />
              </div>
            </div>

            {/* Right Section - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <DealershipFilter />
              <LanguageSwitcher />
              <ThemeToggle />
              {currentDealership?.id && <OnlineUsersIndicator dealerId={currentDealership.id} />}
              {currentDealership?.id && <NotificationBell dealerId={currentDealership.id} />}
              <UserDropdown />
            </div>

            {/* Right Section - Mobile */}
            <div className="flex md:hidden items-center gap-2">
              {/* Mobile: Compact search button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">{t('search.global_placeholder')}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="top" className="h-[85vh] p-0">
                  <div className="p-4">
                    <GlobalSearch />
                  </div>
                </SheetContent>
              </Sheet>
              <UserDropdown />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">{t('layout.mobile_menu')}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>{t('layout.tools')}</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-6 mt-6">
                    {/* Dealership Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('dealerships.dealership')}
                      </label>
                      <DealershipFilter />
                    </div>

                    {/* Language Switcher */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('layout.preferences')}
                      </label>
                      <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />
                      </div>
                    </div>

                    {/* Notifications */}
                    {currentDealership?.id && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('common.notifications')}
                        </label>
                        <NotificationBell dealerId={currentDealership.id} />
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Update Banner - Notifica cuando hay nueva versión disponible */}
          <UpdateBanner />

          {/* Announcement Banner */}
          {!location.pathname.startsWith('/chat') && <AnnouncementBanner />}

          {/* Breadcrumbs */}
          {!location.pathname.startsWith('/chat') && <Breadcrumbs />}

          {/* Main Content */}
          <main className={`flex-1 ${location.pathname.startsWith('/chat') ? 'relative overflow-hidden' : 'p-6 mb-24'}`}>
           {(() => {
             logger.dev('🎯 [OUTLET DEBUG] Rendering content for:', {
               pathname: location.pathname,
               hasChildren: !!children,
               usingOutlet: !children,
               timestamp: new Date().toISOString()
             });
             return children || <Outlet />;
           })()}
          </main>

          {/* Footer - Enterprise (Compact) */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 px-4 sm:px-6 py-2.5 sm:py-3">
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="hidden sm:inline">{t('layout.footer.copyright', { year: currentYear })}</span>
                <span className="sm:hidden">© {currentYear}</span>
                <span className="hidden sm:inline">•</span>
                <VersionDisplay showDetails={true} />
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs sm:text-sm"
                  onClick={() => setPrivacyModalOpen(true)}
                >
                  {t('layout.footer.privacy_policy')}
                </Button>
                <span className="text-muted-foreground/30">•</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs sm:text-sm"
                  onClick={() => setTermsModalOpen(true)}
                >
                  {t('layout.footer.terms_of_service')}
                </Button>
                <span className="text-muted-foreground/30">•</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs sm:text-sm"
                  onClick={() => window.open('mailto:support@mydetailarea.com', '_blank')}
                >
                  {t('layout.footer.support')}
                </Button>
              </div>
            </div>
          </footer>
        </div>

      {/* Floating Chat Bubble */}
      {/* {currentDealership?.id && <FloatingChatBubble />} */}

      {/* Legal Modals */}
      <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
      <TermsOfServiceModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
    </div>
  );
};

export const ProtectedLayout = ({ children, title }: ProtectedLayoutProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Debug navigation rendering
  logger.dev('🏗️ [PROTECTED LAYOUT] Rendering for:', {
    pathname: location.pathname,
    hasUser: !!user,
    loading,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    logger.dev('⏳ [PROTECTED LAYOUT] Auth loading - showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Store the intended destination for post-auth redirect
    const intendedPath = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(intendedPath)}`} replace />;
  }

  // Check if we're in Get Ready to set initial sidebar state
  const isGetReadyModule = location.pathname.startsWith('/get-ready');
  const initialOpen = !isGetReadyModule; // Closed if in Get Ready, open otherwise

  logger.dev('🏗️ [PROTECTED LAYOUT] Sidebar initial state:', {
    pathname: location.pathname,
    isGetReadyModule,
    initialOpen,
    timestamp: new Date().toISOString()
  });

  return (
    <SidebarProvider defaultOpen={initialOpen}>
      <ProtectedLayoutInner title={title}>
        {children}
      </ProtectedLayoutInner>
    </SidebarProvider>
  );
};
