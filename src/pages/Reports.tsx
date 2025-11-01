import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportsLayout } from '@/components/reports/ReportsLayout';
import { ExportCenter } from '@/components/reports/sections/ExportCenter';
import { FinancialReports } from '@/components/reports/sections/FinancialReports';
import { InvoicesReport } from '@/components/reports/sections/InvoicesReport';
import { OperationalReports } from '@/components/reports/sections/OperationalReports';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useReportsData, type ReportsFilters } from '@/hooks/useReportsData';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const { t } = useTranslation();
  const { dealerships, defaultDealerId } = useReportsData();
  const { selectedDealerId } = useDealerFilter();

  // Use global dealer filter if available, otherwise use default
  const effectiveDealerId = selectedDealerId !== 'all' && selectedDealerId !== null
    ? (typeof selectedDealerId === 'number' ? selectedDealerId : parseInt(selectedDealerId))
    : defaultDealerId;

  // Helper function to get week dates (Monday to Sunday)
  const getWeekDates = (date: Date) => {
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = current.getDay();
    const daysToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const { monday: defaultStartDate, sunday: defaultEndDate } = getWeekDates(new Date());

  const [filters, setFilters] = useState<ReportsFilters>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    orderType: 'all',
    status: 'all',
    dealerId: effectiveDealerId
  });

  // Update filters when global dealer filter changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, dealerId: effectiveDealerId }));
  }, [effectiveDealerId]);

  const [activeTab, setActiveTab] = useTabPersistence('reports');

  const handleRefresh = () => {
    // Force refresh by updating a timestamp in the filters
    setFilters(prev => ({ ...prev, dealerId: prev.dealerId }));
  };

  return (
    <div>
      <ReportsLayout
        title={t('reports.title')}
        description={t('reports.overview')}
        actions={
          <>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Main Reports Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="operational">
                {t('reports.tabs.operational')}
              </TabsTrigger>
              <TabsTrigger value="financial">
                {t('reports.tabs.financial')}
              </TabsTrigger>
              <TabsTrigger value="invoices">
                {t('reports.tabs.invoices')}
              </TabsTrigger>
              <TabsTrigger value="export">
                {t('reports.tabs.export')}
              </TabsTrigger>
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

            <TabsContent value="export" className="space-y-6">
              <ExportCenter filters={filters} />
            </TabsContent>
          </Tabs>
        </div>
      </ReportsLayout>
    </div>
  );
}
