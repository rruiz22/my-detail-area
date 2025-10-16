import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { GetReadySplitContent } from './GetReadySplitContent';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { GetReadyTopbar } from './GetReadyTopbar';
import { useGetReadySidebarState } from '@/hooks/useGetReadyPersistence';

interface GetReadyContentProps {
  children?: React.ReactNode;
}

export function GetReadyContent({ children }: GetReadyContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useGetReadySidebarState();

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
      </div>
    </div>
  );
}
