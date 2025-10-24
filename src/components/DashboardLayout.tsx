import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { APP_VERSION } from "@/config/version";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
import { PrivacyPolicyModal } from "@/components/legal/PrivacyPolicyModal";
import { TermsOfServiceModal } from "@/components/legal/TermsOfServiceModal";
import { Search } from "lucide-react";
import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "./AppSidebar";
import { FloatingChatBubble } from "./chat/FloatingChatBubble";
import { DealershipFilter } from "./filters/DealershipFilter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

function DashboardLayoutInner({ children, title }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Version and copyright
  const currentYear = new Date().getFullYear();

  return (
    <>
      <AppSidebar />

      <div className="flex-1 flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 flex items-center justify-between px-6" style={{boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.06)'}}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <SidebarTrigger />
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('layout.search_placeholder')}
                className="pl-10 w-full"
              />
            </div>
            {/* Global Dealer Filter */}
            <DealershipFilter />
          </div>

          <div className="flex items-center gap-4 shrink-0">
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
            <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-wrap justify-center sm:justify-start">
              <span>{t('layout.footer.copyright', { year: currentYear })}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-xs">{t('layout.footer.version', { version: APP_VERSION })}</span>
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
      {currentDealership?.id ? <FloatingChatBubble /> : null}

      {/* Legal Modals */}
      <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
      <TermsOfServiceModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
    </>
  );
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardLayoutInner title={title}>
          {children}
        </DashboardLayoutInner>
      </div>
    </SidebarProvider>
  );
}
