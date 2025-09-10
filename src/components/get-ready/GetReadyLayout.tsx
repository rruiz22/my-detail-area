import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GetReadyTopbar } from './GetReadyTopbar';
import { GetReadyStepsSidebar } from './GetReadyStepsSidebar';
import { cn } from '@/lib/utils';

interface GetReadyLayoutProps {
  children?: React.ReactNode;
}

export function GetReadyLayout({ children }: GetReadyLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <GetReadyTopbar />
      
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-4rem)]">
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
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}