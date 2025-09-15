import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./notifications/NotificationBell";
import { FloatingChatBubble } from "./chat/FloatingChatBubble";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  
  return (
    <SidebarProvider defaultOpen={true}>
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
            
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <ThemeToggle />
              {currentDealership?.id ? <NotificationBell dealerId={currentDealership.id} /> : null}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>© 2025 My Detail Area</span>
                <span>•</span>
                <span>Enterprise Dealership Management</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Button>
                <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Button>
                <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground">
                  Support
                </Button>
              </div>
            </div>
          </footer>
        </div>
        
        {/* Floating Chat Bubble */}
        {currentDealership?.id ? <FloatingChatBubble /> : null}
      </div>
    </SidebarProvider>
  );
}