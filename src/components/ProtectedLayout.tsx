import { PrivacyPolicyModal } from "@/components/legal/PrivacyPolicyModal";
import { TermsOfServiceModal } from "@/components/legal/TermsOfServiceModal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version/VersionDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
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

  // Auto-collapse/expand sidebar for Get Ready module
  useEffect(() => {
    const isGetReadyModule = location.pathname.startsWith('/get-ready');
    const wasGetReadyModule = previousPathRef.current.startsWith('/get-ready');

    logger.dev('🏗️ [PROTECTED LAYOUT] Sidebar navigation check:', {
      pathname: location.pathname,
      previousPath: previousPathRef.current,
      isGetReadyModule,
      wasGetReadyModule,
      sidebarOpen: open,
      timestamp: new Date().toISOString()
    });

    // Case 1: Entering Get Ready - collapse sidebar
    if (isGetReadyModule && !wasGetReadyModule && open) {
      logger.dev('🔧 [PROTECTED LAYOUT] Entering Get Ready - Collapsing sidebar');
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }

    // Case 2: Leaving Get Ready - expand sidebar
    if (!isGetReadyModule && wasGetReadyModule && !open) {
      logger.dev('🔧 [PROTECTED LAYOUT] Leaving Get Ready - Opening sidebar');
      setTimeout(() => {
        setOpen(true);
      }, 100);
    }

    // Case 3: Already in Get Ready and sidebar is open - keep it collapsed
    if (isGetReadyModule && open) {
      logger.dev('🔧 [PROTECTED LAYOUT] In Get Ready with open sidebar - Collapsing');
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }

    // Update previous path reference
    previousPathRef.current = location.pathname;
  }, [location.pathname, open, setOpen]);

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

          {/* Announcement Banner */}
          <AnnouncementBanner />

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Main Content */}
          <main className="flex-1 p-6 mb-24">
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

          {/* Footer - Enterprise */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-wrap justify-center sm:justify-start">
                <span>{t('layout.footer.copyright', { year: new Date().getFullYear() })}</span>
                <span className="hidden sm:inline">•</span>
                <VersionDisplay showDetails={true} />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0"
                  onClick={() => setPrivacyModalOpen(true)}
                >
                  {t('layout.footer.privacy_policy')}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0"
                  onClick={() => setTermsModalOpen(true)}
                >
                  {t('layout.footer.terms_of_service')}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-auto p-0"
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
