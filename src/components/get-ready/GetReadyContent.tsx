import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { GetReadySplitContent } from './GetReadySplitContent';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { GetReadyTopbar } from './GetReadyTopbar';

interface GetReadyContentProps {
  children?: React.ReactNode;
}

export function GetReadyContent({ children }: GetReadyContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        {/* Steps Sidebar */}
        <div className={cn(
          "border-r bg-card transition-all duration-300 flex-shrink-0",
          sidebarCollapsed
            ? "w-14 min-w-14"
            : "w-[260px] min-w-[260px] max-w-[260px] lg:w-[260px] md:w-56 sm:w-48"
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
