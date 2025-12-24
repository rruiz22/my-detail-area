import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WeekNavigator } from '@/components/ui/WeekNavigator';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AlertCircle, BarChart3, Calendar, Clock, Kanban, List, Printer, Search, X, CalendarDays, ChevronDown } from 'lucide-react';
import { memo, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from '@/hooks/useDetailHubAnalytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { LucideIcon } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  color: string;
}

interface QuickFilterBarProps {
  activeFilter: string;
  tabCounts: Record<string, number>;
  onFilterChange: (filter: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  viewMode?: 'kanban' | 'table' | 'calendar';
  onViewModeChange?: (mode: 'kanban' | 'table' | 'calendar') => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
  onPrintList?: () => void;
  isPrinting?: boolean;
  excludeFilters?: string[];
}

export const QuickFilterBar = memo(function QuickFilterBar({
  activeFilter,
  tabCounts,
  onFilterChange,
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  viewMode,
  onViewModeChange,
  showFilters = false,
  onToggleFilters,
  weekOffset = 0,
  onWeekChange,
  onPrintList,
  isPrinting = false,
  excludeFilters = []
}: QuickFilterBarProps) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

  // Memoized date presets - only recalculate when component mounts (dates change at midnight)
  const presets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    return {
      yesterday: { from: yesterday, to: yesterday },
      today: { from: today, to: today },
      thisWeek: { from: startOfWeek, to: today },
      thisMonth: { from: startOfMonth, to: today },
      last30Days: { from: last30Days, to: today }
    };
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to table if on mobile and kanban/calendar is selected
  useEffect(() => {
    if (viewMode && onViewModeChange && isMobile && (viewMode === 'kanban' || viewMode === 'calendar')) {
      onViewModeChange('table');
    }
  }, [isMobile, viewMode, onViewModeChange]);

  // All possible filter options
  const allFilterOptions: FilterOption[] = [
    {
      id: 'dashboard',
      label: t('sales_orders.filters.overview'),
      count: 0,
      icon: BarChart3,
      color: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      id: 'today',
      label: t('sales_orders.filters.today'),
      count: tabCounts.today || 0,
      icon: Calendar,
      color: 'bg-success/10 text-success border-success/20'
    },
    {
      id: 'tomorrow',
      label: t('sales_orders.filters.tomorrow'),
      count: tabCounts.tomorrow || 0,
      icon: Clock,
      color: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      id: 'queued',
      label: t('sales_orders.tabs.queued'),
      count: tabCounts.queued || 0,
      icon: AlertCircle,
      color: 'bg-warning/10 text-warning border-warning/20'
    },
    {
      id: 'queue',
      label: t('sales_orders.tabs.queue'),
      count: tabCounts.queue || 0,
      icon: AlertCircle,
      color: 'bg-warning/10 text-warning border-warning/20'
    },
    {
      id: 'week',
      label: t('sales_orders.filters.week'),
      count: tabCounts.week || 0,
      icon: BarChart3,
      color: 'bg-accent/10 text-accent border-accent/20'
    },
    {
      id: 'all',
      label: t('sales_orders.filters.all_orders'),
      count: 0,
      icon: List,
      color: 'bg-muted/50 text-foreground border-border'
    }
  ];

  // Filter to only show options that exist in tabCounts (or are always visible like dashboard/all)
  const filterOptions = allFilterOptions.filter(option => {
    // Exclude filters specified in excludeFilters prop
    if (excludeFilters.includes(option.id)) return false;
    // Always show dashboard and all
    if (option.id === 'dashboard' || option.id === 'all') return true;
    // Show only if the field exists in tabCounts (not undefined)
    return tabCounts[option.id] !== undefined;
  });

  return (
    <Card className="border-border shadow-sm" data-testid="quick-filter-bar">
      <div className="p-4 space-y-4">
        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search and Date Filter */}
          <div className="flex flex-1 gap-2 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('layout.search_placeholder')}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10 bg-background"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                  aria-label={t('layout.clear_search')}
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>

            {/* Date Range Filter - Only show if callback provided */}
            {onDateRangeChange && (
              <div className="flex gap-2">
                <div className="relative">
                  <DateRangePicker
                    value={dateRange || { from: null, to: null }}
                    onChange={onDateRangeChange}
                    className="w-full"
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDateRangeChange({ from: null, to: null })}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted z-10"
                      aria-label={t('orders.filters.clear')}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>

                {/* Date Presets Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('orders.filters.quick_dates')}</span>
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onDateRangeChange(presets.yesterday)}>
                      {t('orders.filters.yesterday')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDateRangeChange(presets.today)}>
                      {t('orders.filters.today')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDateRangeChange(presets.thisWeek)}>
                      {t('orders.filters.this_week')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDateRangeChange(presets.thisMonth)}>
                      {t('orders.filters.this_month')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDateRangeChange(presets.last30Days)}>
                      {t('orders.filters.last_30_days')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDateRangeChange({ from: null, to: null })}>
                      {t('orders.filters.clear')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* View Mode & Filters Toggle */}
          <div className="flex items-center gap-2">
            {/* Print List Button - Only show if callback provided */}
            {onPrintList && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPrintList}
                disabled={isPrinting}
                className="h-8 px-3"
                title={t('common.action_buttons.print_filtered_orders')}
              >
                <Printer className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {isPrinting ? t('common.action_buttons.printing') : t('common.action_buttons.print_list')}
                </span>
              </Button>
            )}

            {/* View Mode Toggle - Only show if viewMode props are provided */}
            {viewMode && onViewModeChange && (
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                {/* Table - Always first and available */}
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => onViewModeChange('table')}
                  className="h-8 px-2 sm:px-3"
                >
                  <List className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>

                {/* Kanban - Only on desktop */}
                {!isMobile && (
                  <Button
                    size="sm"
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    onClick={() => onViewModeChange('kanban')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Kanban className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Kanban</span>
                  </Button>
                )}


              </div>
            )}


          </div>
        </div>

        {/* Filter Pills - Mobile Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeFilter === option.id;

            return (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onFilterChange(option.id)}
                className={`
                  h-9 px-2 sm:px-3 border-2 transition-all duration-200 hover:scale-105
                  ${isActive
                    ? `${option.color} shadow-sm`
                    : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">{option.label}</span>
                {option.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`
                      ml-2 text-xs px-1.5 py-0 min-w-[20px] h-5
                      ${isActive
                        ? 'bg-white/20 text-current'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {option.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Active Filter Indicator */}
        {activeFilter !== 'dashboard' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Active filter:</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {filterOptions.find(f => f.id === activeFilter)?.label}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange('dashboard')}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>

            {/* Week Navigator - Only show when Week filter is active */}
            {activeFilter === 'week' && onWeekChange && (
              <WeekNavigator
                weekOffset={weekOffset}
                onWeekChange={onWeekChange}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
