import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReadySidebarState } from '@/hooks/useGetReadyPersistence';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GetReadySplitContent } from './GetReadySplitContent';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { GetReadyTopbar } from './GetReadyTopbar';
import { SelectDealershipPrompt } from './SelectDealershipPrompt';

interface GetReadyContentProps {
  children?: React.ReactNode;
}

export function GetReadyContent({ children }: GetReadyContentProps) {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useGetReadySidebarState();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { currentDealership, loading: dealershipsLoading } = useAccessibleDealerships();

  // ✅ PERF FIX: Don't show prompt while dealerships are loading
  // This prevents the flash of "select dealership" screen
  const hasValidDealership = currentDealership && typeof currentDealership.id === 'number';
  const isLoadingDealership = dealershipsLoading && !currentDealership;

  // Detect mobile and auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    // Check initial screen size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  // Close mobile drawer when step is selected
  const handleMobileStepSelect = () => {
    setMobileDrawerOpen(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Get Ready Secondary Navigation */}
      <GetReadyTopbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ✅ PERF FIX: Show loading skeleton while dealerships load */}
        {isLoadingDealership ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-6 animate-pulse max-w-md w-full p-6">
              <div className="h-16 w-16 bg-muted rounded-full mx-auto"></div>
              <div className="h-6 bg-muted rounded w-2/3 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6 mx-auto"></div>
            </div>
          </div>
        ) : !hasValidDealership ? (
          /* Show prompt only if dealerships loaded but none selected */
          <div className="flex-1">
            <SelectDealershipPrompt />
          </div>
        ) : (
          <>
            {/* Desktop: Steps Sidebar - Hidden on mobile */}
            <div className={cn(
              "border-r bg-card transition-all duration-300 flex-shrink-0 hidden md:block",
              sidebarCollapsed
                ? "w-12 min-w-12"
                : "w-[225px] min-w-[225px] max-w-[225px]"
            )}>
              <GetReadyStepsSidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>

            {/* Mobile: Floating Steps Button + Drawer - Always render but hide on desktop */}
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="fixed bottom-4 left-4 z-50 shadow-lg rounded-full h-12 w-12 p-0 md:hidden"
                >
                  <Layers className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 md:hidden">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('get_ready.steps.workflow_steps')}</SheetTitle>
                </SheetHeader>
                <div onClick={handleMobileStepSelect}>
                  <GetReadyStepsSidebar
                    collapsed={false}
                    onToggleCollapse={() => {}}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-hidden">
                {children || <GetReadySplitContent className="p-2 sm:p-4" />}
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
