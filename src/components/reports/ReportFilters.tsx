import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReportsFilters } from '@/hooks/useReportsData';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSystemTimezone } from '@/utils/dateUtils';

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
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Fetch services based on selected dealer and order type
  useEffect(() => {
    const fetchServices = async () => {
      if (!filters.dealerId) return;

      setServicesLoading(true);
      try {
        // If 'all' departments, fetch ALL services from dealer_services table
        if (filters.orderType === 'all') {
          const { data, error } = await supabase
            .from('dealer_services')
            .select(`
              id,
              name,
              description,
              price,
              duration,
              category_id,
              color,
              service_categories (
                name,
                color
              )
            `)
            .eq('dealer_id', filters.dealerId)
            .eq('is_active', true)
            .order('name');

          if (error) throw error;

          // Transform to match expected format
          const transformedServices = (data || []).map((service: any) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category_id: service.category_id,
            category_name: service.service_categories?.name,
            category_color: service.service_categories?.color,
            color: service.color,
          }));

          setServices(transformedServices);
        } else {
          // Fetch services for specific department
          const departmentMap: Record<string, string> = {
            'sales': 'Sales Dept',
            'service': 'Service Dept',
            'recon': 'Recon Dept',
            'carwash': 'CarWash Dept'  // Note: No space in "CarWash" to match DB
          };

          const departmentName = departmentMap[filters.orderType];

          const { data, error } = await supabase.rpc('get_dealer_services_by_department', {
            p_dealer_id: filters.dealerId,
            p_department_name: departmentName
          });

          if (error) throw error;

          setServices(data || []);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, [filters.dealerId, filters.orderType]);

  // Helper function to get week dates (Monday to Sunday) in system timezone
  const getWeekDates = (date: Date) => {
    const timezone = getSystemTimezone();
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const current = new Date(dateInTimezone.getFullYear(), dateInTimezone.getMonth(), dateInTimezone.getDate());
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
    const timezone = getSystemTimezone();
    const now = new Date();
    const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const today = new Date(todayInTimezone.getFullYear(), todayInTimezone.getMonth(), todayInTimezone.getDate());
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
      status: 'all',
      serviceIds: []
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

        {/* Service Filter - Multi-select */}
        <div className="relative w-48">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                disabled={servicesLoading}
              >
                {filters.serviceIds && filters.serviceIds.length > 0 ? (
                  <span className="truncate">
                    {filters.serviceIds.length} {t('reports.filters.service', 'service')}
                    {filters.serviceIds.length > 1 ? 's' : ''} {t('common.selected', 'selected')}
                  </span>
                ) : (
                  <span>{t('reports.filters.all_services', 'All Services')}</span>
                )}
                <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('reports.filters.select_service', 'Select Services')}</span>
                  <div className="flex gap-1">
                    {services.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allServiceIds = services.map((s: any) => s.id);
                          onFiltersChange({ ...filters, serviceIds: allServiceIds });
                        }}
                        className="h-6 text-xs"
                      >
                        {t('common.select_all', 'Select All')}
                      </Button>
                    )}
                  {filters.serviceIds && filters.serviceIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange({ ...filters, serviceIds: [] })}
                      className="h-6 text-xs"
                    >
                      {t('common.clear_all', 'Clear All')}
                    </Button>
                  )}
                  </div>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {servicesLoading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {t('common.loading', 'Loading...')}
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {t('reports.filters.no_services', 'No services available')}
                  </div>
                ) : (
                  services.map((service: any) => {
                    const isSelected = filters.serviceIds?.includes(service.id);
                    return (
                      <div
                        key={service.id}
                        className={cn(
                          "flex items-center space-x-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 border",
                          isSelected
                            ? "bg-primary/10 border-primary/30 hover:bg-primary/15"
                            : "bg-background border-transparent hover:bg-accent hover:border-border"
                        )}
                        onClick={() => {
                          const currentIds = filters.serviceIds || [];
                          const newIds = isSelected
                            ? currentIds.filter(id => id !== service.id)
                            : [...currentIds, service.id];
                          onFiltersChange({ ...filters, serviceIds: newIds });
                        }}
                      >
                        <div className={cn(
                          "flex items-center justify-center h-5 w-5 rounded border-2 transition-all",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input bg-background"
                        )}>
                          {isSelected && (
                            <svg
                              className="h-3.5 w-3.5 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 cursor-pointer">
                          <div className={cn(
                            "text-sm font-medium transition-colors",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                          {service.name}
                          </div>
                          {service.category_name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {service.category_name}
                            </div>
                          )}
                        </div>
                        {service.price && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ${service.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(filters.orderType !== 'all' || filters.status !== 'all' || services.length > 0) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-4">
          <span className="font-medium">{t('reports.filters.active_filters')}:</span>
          <div className="flex gap-2 flex-wrap">
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
            {services.map((service: any) => {
              const isSelected = filters.serviceIds?.includes(service.id);
              return (
                <span
                  key={service.id}
                  className={cn(
                    "px-2 py-1 rounded-md font-medium",
                    isSelected
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-red-500/10 text-red-600"
                  )}
                >
                  {service.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
