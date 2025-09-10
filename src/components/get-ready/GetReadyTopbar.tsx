import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  RefreshCw, 
  Printer, 
  Download,
  Settings,
  HelpCircle,
  Grid3X3,
  Eye,
  UserCheck,
  FileText,
  Users,
  BarChart3,
  Wrench,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabConfig {
  key: string;
  icon: React.ElementType;
  path: string;
}

const TABS: TabConfig[] = [
  { key: 'overview', icon: Grid3X3, path: '/get-ready' },
  { key: 'details_view', icon: Eye, path: '/get-ready/details' },
  { key: 'approvals', icon: UserCheck, path: '/get-ready/approvals' },
  { key: 'forms', icon: FileText, path: '/get-ready/forms' },
  { key: 'vendors', icon: Users, path: '/get-ready/vendors' },
  { key: 'reports', icon: BarChart3, path: '/get-ready/reports' },
  { key: 'integrations', icon: Package, path: '/get-ready/integrations' },
  { key: 'setup', icon: Wrench, path: '/get-ready/setup' },
  { key: 'help', icon: HelpCircle, path: '/get-ready/help' }
];

export function GetReadyTopbar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section - Navigation Tabs */}
        <div className="flex items-center space-x-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
              (tab.path === '/get-ready' && location.pathname === '/get-ready');
            
            return (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t(`get_ready.tabs.${tab.key}`)}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Right Section - Search and Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('get_ready.search_placeholder')}
              className="pl-8 w-64"
            />
          </div>

          {/* Action Buttons */}
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            {t('common.print')}
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}