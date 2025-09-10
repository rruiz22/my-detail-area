import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useTranslation } from "react-i18next";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

// Synchronously read sidebar state before rendering (no async, no useEffect)
const getSavedSidebarState = (): boolean => {
  try {
    const saved = localStorage.getItem('mda.ui.sidebar.open');
    return saved !== null ? JSON.parse(saved) : true;
  } catch {
    return true; // Default to open if error
  }
};

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const initialSidebarState = getSavedSidebarState();
  
  return (
    <SidebarProvider 
      defaultOpen={initialSidebarState}
      onOpenChange={(open) => {
        try {
          localStorage.setItem('mda.ui.sidebar.open', JSON.stringify(open));
          console.log('💾 Sidebar state saved:', open);
        } catch (error) {
          console.warn('Failed to save sidebar state:', error);
        }
      }}
    >
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Sticky Header */}
          <header className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 flex items-center justify-between px-6" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
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
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center bg-accent">
                  3
                </Badge>
              </Button>
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
      </div>
    </SidebarProvider>
  );
}