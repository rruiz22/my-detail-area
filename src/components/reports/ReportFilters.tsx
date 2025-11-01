import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReportsFilters } from '@/hooks/useReportsData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReportFiltersProps {
  filters: ReportsFilters;
  onFiltersChange: (filters: ReportsFilters) => void;
}

type DateRangeType = 'today' | 'this_week' | 'last_week' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const { t } = useTranslation();

  // Helper function to get week dates (Monday to Sunday)
  const getWeekDates = (date: Date) => {
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate days to Monday
    const daysToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + daysToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
  };

  // Function to detect if a specific date range is active
  const isActiveRange = (rangeType: DateRangeType): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const filterStart = new Date(filters.startDate.getFullYear(), filters.startDate.getMonth(), filters.startDate.getDate());
    const filterEnd = new Date(filters.endDate.getFullYear(), filters.endDate.getMonth(), filters.endDate.getDate());

    switch (rangeType) {
      case 'today': {
        return filterStart.getTime() === today.getTime() && filterEnd.getTime() === today.getTime();
      }
      case 'this_week': {
        const { monday, sunday } = getWeekDates(now);
        const mondayTime = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
        const sundayTime = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()).getTime();
        return filterStart.getTime() === mondayTime && filterEnd.getTime() === sundayTime;
      }
      case 'last_week': {
        const lastWeekDate = new Date(now);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const { monday, sunday } = getWeekDates(lastWeekDate);
        const mondayTime = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
        const sundayTime = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()).getTime();
        return filterStart.getTime() === mondayTime && filterEnd.getTime() === sundayTime;
      }
      case 'last_30_days': {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        return filterStart.getTime() === startDate.getTime() && filterEnd.getTime() === today.getTime();
      }
      case 'last_90_days': {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        return filterStart.getTime() === startDate.getTime() && filterEnd.getTime() === today.getTime();
      }
      case 'this_year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return filterStart.getTime() === yearStart.getTime() && filterEnd.getTime() === today.getTime();
      }
      default:
        return false;
    }
  };

  const quickDateRanges: Array<{ label: string; value: DateRangeType }> = [
    {
      label: 'Today',
      value: 'today',
    },
    {
      label: 'This Week',
      value: 'this_week',
    },
    {
      label: 'Last Week',
      value: 'last_week',
    },
    {
      label: 'Last 30 Days',
      value: 'last_30_days',
    },
    {
      label: 'Last 90 Days',
      value: 'last_90_days',
    },
    {
      label: 'This Year',
      value: 'this_year',
    }
  ];

  const handleQuickDateRange = (rangeType: DateRangeType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let endDate: Date;

    switch (rangeType) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'this_week': {
        const { monday, sunday } = getWeekDates(now);
        startDate = monday;
        endDate = sunday;
        break;
      }
      case 'last_week': {
        const lastWeekDate = new Date(now);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const { monday, sunday } = getWeekDates(lastWeekDate);
        startDate = monday;
        endDate = sunday;
        break;
      }
      case 'last_30_days':
        endDate = new Date(today);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last_90_days':
        endDate = new Date(today);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        break;
      case 'this_year':
        endDate = new Date(today);
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate
    });
  };

  const clearFilters = () => {
    const now = new Date();
    const { monday, sunday } = getWeekDates(now);

    onFiltersChange({
      ...filters,
      startDate: monday,
      endDate: sunday,
      orderType: 'all',
      status: 'all'
      // dealerId is now controlled by global filter, don't reset it
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Date Ranges */}
      <div className="flex flex-wrap gap-2">
        {quickDateRanges.map((range) => {
          const isActive = isActiveRange(range.value);
          return (
            <Button
              key={range.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickDateRange(range.value)}
              className={cn(
                "text-sm",
                isActive && "bg-primary text-primary-foreground shadow-sm"
              )}
            >
              {range.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          {t('reports.filters.clear_all')}
        </Button>
      </div>

      {/* Main Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4" />
          {t('reports.filters.filters')}:
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-48 justify-start text-left font-normal',
                  !filters.startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? (
                  format(filters.startDate, 'MMM dd, yyyy')
                ) : (
                  <span>{t('reports.filters.start_date')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) =>
                  date && onFiltersChange({ ...filters, startDate: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-48 justify-start text-left font-normal',
                  !filters.endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? (
                  format(filters.endDate, 'MMM dd, yyyy')
                ) : (
                  <span>{t('reports.filters.end_date')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) =>
                  date && onFiltersChange({ ...filters, endDate: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Order Type Filter */}
        <Select
          value={filters.orderType}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, orderType: value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('reports.filters.select_department')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.filters.all_departments')}</SelectItem>
            <SelectItem value="sales">{t('reports.filters.sales')}</SelectItem>
            <SelectItem value="service">{t('reports.filters.service')}</SelectItem>
            <SelectItem value="recon">{t('reports.filters.recon')}</SelectItem>
            <SelectItem value="carwash">{t('reports.filters.car_wash')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('reports.filters.select_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.filters.all_statuses')}</SelectItem>
            <SelectItem value="pending">{t('reports.filters.pending')}</SelectItem>
            <SelectItem value="in_progress">{t('reports.filters.in_progress')}</SelectItem>
            <SelectItem value="completed">{t('reports.filters.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('reports.filters.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Indicator */}
      {(filters.orderType !== 'all' || filters.status !== 'all') && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-4">
          <span className="font-medium">{t('reports.filters.active_filters')}:</span>
          <div className="flex gap-2">
            {filters.orderType !== 'all' && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                {t(`reports.filters.${filters.orderType === 'carwash' ? 'car_wash' : filters.orderType}`)}
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-md font-medium">
                {t(`reports.filters.${filters.status}`)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
