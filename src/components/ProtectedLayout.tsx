import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { Search } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { FloatingChatBubble } from "./chat/FloatingChatBubble";
import { DealershipFilter } from "./filters/DealershipFilter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { UserDropdown } from "./ui/user-dropdown";

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

  // Auto-collapse/expand sidebar for Get Ready module
  useEffect(() => {
    const isGetReadyModule = location.pathname.startsWith('/get-ready');
    const wasGetReadyModule = previousPathRef.current.startsWith('/get-ready');

    console.log('🏗️ [PROTECTED LAYOUT] Sidebar navigation check:', {
      pathname: location.pathname,
      previousPath: previousPathRef.current,
      isGetReadyModule,
      wasGetReadyModule,
      sidebarOpen: open,
      timestamp: new Date().toISOString()
    });

    // Case 1: Entering Get Ready - collapse sidebar
    if (isGetReadyModule && !wasGetReadyModule && open) {
      console.log('🔧 [PROTECTED LAYOUT] Entering Get Ready - Collapsing sidebar');
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }

    // Case 2: Leaving Get Ready - expand sidebar
    if (!isGetReadyModule && wasGetReadyModule && !open) {
      console.log('🔧 [PROTECTED LAYOUT] Leaving Get Ready - Opening sidebar');
      setTimeout(() => {
        setOpen(true);
      }, 100);
    }

    // Case 3: Already in Get Ready and sidebar is open - keep it collapsed
    if (isGetReadyModule && open) {
      console.log('🔧 [PROTECTED LAYOUT] In Get Ready with open sidebar - Collapsing');
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
          <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 flex items-center justify-between px-6" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('layout.search_placeholder')}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DealershipFilter />
              <LanguageSwitcher />
              <ThemeToggle />
              {currentDealership?.id && <NotificationBell dealerId={currentDealership.id} />}
              <UserDropdown />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 mb-24">
           {(() => {
             console.log('🎯 [OUTLET DEBUG] Rendering content for:', {
               pathname: location.pathname,
               hasChildren: !!children,
               usingOutlet: !children,
               timestamp: new Date().toISOString()
             });
             return children || <Outlet />;
           })()}
          </main>

          {/* Footer - Minimalist */}
          <footer className="border-t bg-background px-6 py-3">
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>© 2025 My Detail Area</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </footer>
        </div>

      {/* Floating Chat Bubble */}
      {currentDealership?.id && <FloatingChatBubble />}
    </div>
  );
};

export const ProtectedLayout = ({ children, title }: ProtectedLayoutProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Debug navigation rendering
  console.log('🏗️ [PROTECTED LAYOUT] Rendering for:', {
    pathname: location.pathname,
    hasUser: !!user,
    loading,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('⏳ [PROTECTED LAYOUT] Auth loading - showing spinner');
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

  console.log('🏗️ [PROTECTED LAYOUT] Sidebar initial state:', {
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
