import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GetReadyTopbar } from './GetReadyTopbar';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { GetReadySplitContent } from './GetReadySplitContent';
import { cn } from '@/lib/utils';

interface GetReadyContentProps {
  children?: React.ReactNode;
}

export function GetReadyContent({ children }: GetReadyContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Get Ready Secondary Navigation */}
      <GetReadyTopbar />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Steps Sidebar */}
        <div className={cn(
          "border-r bg-card transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-80"
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