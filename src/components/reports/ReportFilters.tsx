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

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const { t } = useTranslation();

  const quickDateRanges = [
    {
      label: t('reports.filters.last_7_days'),
      value: 7,
    },
    {
      label: t('reports.filters.last_30_days'),
      value: 30,
    },
    {
      label: t('reports.filters.last_90_days'),
      value: 90,
    },
    {
      label: t('reports.filters.this_year'),
      value: 365,
    }
  ];

  const handleQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    onFiltersChange({
      ...filters,
      startDate,
      endDate
    });
  };

  const clearFilters = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    onFiltersChange({
      ...filters,
      startDate,
      endDate,
      orderType: 'all',
      status: 'all'
      // dealerId is now controlled by global filter, don't reset it
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Date Ranges */}
      <div className="flex flex-wrap gap-2">
        {quickDateRanges.map((range) => (
          <Button
            key={range.value}
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateRange(range.value)}
            className="text-sm"
          >
            {range.label}
          </Button>
        ))}
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
    </div>
  );
};
