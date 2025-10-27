import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReadySidebarState } from '@/hooks/useGetReadyPersistence';
import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { GetReadySplitContent } from './GetReadySplitContent';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { GetReadyTopbar } from './GetReadyTopbar';
import { SelectDealershipPrompt } from './SelectDealershipPrompt';

interface GetReadyContentProps {
  children?: React.ReactNode;
}

export function GetReadyContent({ children }: GetReadyContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useGetReadySidebarState();
  const { currentDealership, loading: dealershipsLoading } = useAccessibleDealerships();

  // ✅ PERF FIX: Don't show prompt while dealerships are loading
  // This prevents the flash of "select dealership" screen
  const hasValidDealership = currentDealership && typeof currentDealership.id === 'number';
  const isLoadingDealership = dealershipsLoading && !currentDealership;

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setSidebarCollapsed(true);
      }
    };

    // Check initial screen size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Get Ready Secondary Navigation */}
      <GetReadyTopbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
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
            {/* Steps Sidebar - OPTIMIZED WIDTH */}
            <div className={cn(
              "border-r bg-card transition-all duration-300 flex-shrink-0",
              sidebarCollapsed
                ? "w-12 min-w-12"
                : "w-[225px] min-w-[225px] max-w-[225px] lg:w-[225px] md:w-48 sm:w-40"
            )}>
              <GetReadyStepsSidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-hidden">
                {children || <GetReadySplitContent className="p-4" />}
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
