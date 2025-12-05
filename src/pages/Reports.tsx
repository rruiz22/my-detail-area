import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportsLayout } from '@/components/reports/ReportsLayout';
import { ExportCenter } from '@/components/reports/sections/ExportCenter';
import { FinancialReports } from '@/components/reports/sections/FinancialReports';
import { InvoicesReport } from '@/components/reports/sections/InvoicesReport';
import { OperationalReports } from '@/components/reports/sections/OperationalReports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useReportsData, type ReportsFilters } from '@/hooks/useReportsData';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getSystemTimezone } from '@/utils/dateUtils';

export default function Reports() {
  const { t } = useTranslation();
  const { dealerships, defaultDealerId } = useReportsData();
  const { selectedDealerId } = useDealerFilter();
  const { enhancedUser } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use global dealer filter if available, otherwise use default
  const effectiveDealerId = selectedDealerId !== 'all' && selectedDealerId !== null
    ? (typeof selectedDealerId === 'number' ? selectedDealerId : parseInt(selectedDealerId))
    : defaultDealerId;

  // Helper function to get week dates (Monday to Sunday) in system timezone
  const getWeekDates = (date: Date) => {
    const timezone = getSystemTimezone();
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const current = new Date(dateInTimezone.getFullYear(), dateInTimezone.getMonth(), dateInTimezone.getDate());
    const day = current.getDay();
    const daysToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const { monday: defaultStartDate, sunday: defaultEndDate } = getWeekDates(new Date());

  // Load filters from localStorage on mount
  const loadFiltersFromStorage = (): ReportsFilters => {
    try {
      const savedFilters = localStorage.getItem('reports_filters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        const timezone = getSystemTimezone();
        // Parse dates in system timezone to avoid UTC conversion issues
        const startDateStr = new Date(parsed.startDate).toLocaleString('en-US', { timeZone: timezone });
        const endDateStr = new Date(parsed.endDate).toLocaleString('en-US', { timeZone: timezone });
        return {
          ...parsed,
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          dealerId: effectiveDealerId // Always use current dealer
        };
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }

    return {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      orderType: 'all',
      status: 'all',
      serviceIds: [],
      dealerId: effectiveDealerId
    };
  };

  const [filters, setFilters] = useState<ReportsFilters>(loadFiltersFromStorage);

  // Save filters to localStorage whenever they change (except dealerId)
  useEffect(() => {
    try {
      const filtersToSave = {
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        orderType: filters.orderType,
        status: filters.status,
        serviceIds: filters.serviceIds || []
      };
      localStorage.setItem('reports_filters', JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters.startDate, filters.endDate, filters.orderType, filters.status, filters.serviceIds]);

  // Update filters when global dealer filter changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, dealerId: effectiveDealerId }));
  }, [effectiveDealerId]);

  const [activeTab, setActiveTab] = useTabPersistence('reports');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all reports-related queries to force a refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['department-revenue'] }),
        queryClient.invalidateQueries({ queryKey: ['performance-trends'] }),
        queryClient.invalidateQueries({ queryKey: ['operational-vehicles-list'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoice-summary'] }),
      ]);

      toast({
        description: t('common.data_refreshed') || 'Data refreshed successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error refreshing reports:', error);
      toast({
        description: t('common.refresh_failed') || 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <ReportsLayout
        title={t('reports.title')}
        description={t('reports.overview')}
        actions={
          <>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('common.refreshing') || 'Refreshing...' : t('common.refresh')}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Main Reports Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${enhancedUser?.is_system_admin ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="operational">
                {t('reports.tabs.operational')}
              </TabsTrigger>
              <TabsTrigger value="financial">
                {t('reports.tabs.financial')}
              </TabsTrigger>
              <TabsTrigger value="invoices">
                {t('reports.tabs.invoices')}
              </TabsTrigger>
              {enhancedUser?.is_system_admin && (
                <TabsTrigger value="export" className="relative">
                  {t('reports.tabs.export')}
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-700 border-amber-300"
                  >
                    Hidden
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="operational" className="space-y-6">
              {/* Report Filters */}
              <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
              <OperationalReports filters={filters} />
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              {/* Report Filters */}
              <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
              <FinancialReports filters={filters} />
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
              <InvoicesReport filters={filters} />
            </TabsContent>

            {enhancedUser?.is_system_admin && (
              <TabsContent value="export" className="space-y-6">
                <ExportCenter filters={filters} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ReportsLayout>
    </div>
  );
}
