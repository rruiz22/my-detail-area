import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ReportsLayout } from '@/components/reports/ReportsLayout';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { OperationalReports } from '@/components/reports/sections/OperationalReports';
import { FinancialReports } from '@/components/reports/sections/FinancialReports';
import { ExportCenter } from '@/components/reports/sections/ExportCenter';
import { useReportsData, type ReportsFilters } from '@/hooks/useReportsData';
import { useTabPersistence } from '@/hooks/useTabPersistence';

export default function Reports() {
  const { t } = useTranslation();
  const { dealerships, defaultDealerId } = useReportsData();
  
  const [filters, setFilters] = useState<ReportsFilters>({
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    })(),
    endDate: new Date(),
    orderType: 'all',
    status: 'all',
    dealerId: defaultDealerId
  });

  const [activeTab, setActiveTab] = useTabPersistence('reports');

  const handleRefresh = () => {
    // Force refresh by updating a timestamp in the filters
    setFilters(prev => ({ ...prev, dealerId: prev.dealerId }));
  };

  return (
    <DashboardLayout title={t('pages.reports')}>
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
          {/* Report Filters */}
          <ReportFilters
            filters={filters}
            onFiltersChange={setFilters}
            dealerships={dealerships}
            showDealershipFilter={dealerships.length > 1}
          />

          {/* Main Reports Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="operational">
                {t('reports.tabs.operational')}
              </TabsTrigger>
              <TabsTrigger value="financial">
                {t('reports.tabs.financial')}
              </TabsTrigger>
              <TabsTrigger value="export">
                {t('reports.tabs.export')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="operational" className="space-y-6">
              <OperationalReports filters={filters} />
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <FinancialReports filters={filters} />
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <ExportCenter filters={filters} />
            </TabsContent>
          </Tabs>
        </div>
      </ReportsLayout>
    </DashboardLayout>
  );
}