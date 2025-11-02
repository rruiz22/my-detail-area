import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Mail,
  Calendar,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import type { ReportsFilters } from '@/hooks/useReportsData';
import { useOrdersAnalytics, useRevenueAnalytics, usePerformanceTrends } from '@/hooks/useReportsData';
import { useInvoiceSummary } from '@/hooks/useInvoices';
import { generateReportPDF } from '@/utils/generateReportPDF';
import { generateReportExcel } from '@/utils/generateReportExcel';
import { generateReportCSV } from '@/utils/generateReportCSV';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

interface ExportCenterProps {
  filters: ReportsFilters;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { dealerships } = useAccessibleDealerships();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exportSections, setExportSections] = useState({
    summary: true,
    charts: true,
    tables: true,
    trends: false
  });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data for exports
  const { data: ordersData } = useOrdersAnalytics(filters);
  const { data: revenueData } = useRevenueAnalytics(filters);
  const { data: performanceData } = usePerformanceTrends(filters);
  const { data: invoicesData } = useInvoiceSummary({
    dealerId: filters.dealerId,
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  const exportReports = [
    {
      id: 'operational',
      title: t('reports.export.operational_report'),
      description: t('reports.export.operational_description'),
      icon: <FileText className="h-5 w-5" />,
      formats: ['pdf', 'excel']
    },
    {
      id: 'financial',
      title: t('reports.export.financial_report'),
      description: t('reports.export.financial_description'),
      icon: <FileSpreadsheet className="h-5 w-5" />,
      formats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'performance',
      title: t('reports.export.performance_report'),
      description: t('reports.export.performance_description'),
      icon: <FileText className="h-5 w-5" />,
      formats: ['pdf', 'excel']
    },
    {
      id: 'custom',
      title: t('reports.export.custom_report'),
      description: t('reports.export.custom_description'),
      icon: <FileSpreadsheet className="h-5 w-5" />,
      formats: ['pdf', 'excel', 'csv']
    }
  ];

  const handleExport = async (reportType: string) => {
    setIsExporting(true);
    try {
      // Get dealership name
      const dealership = dealerships.find(d => d.id === filters.dealerId);
      const dealershipName = dealership?.name || 'My Detail Area';

      // Select data based on report type
      let reportData = null;
      switch (reportType) {
        case 'operational':
          reportData = ordersData || null;
          break;
        case 'financial':
          reportData = revenueData || null;
          break;
        case 'performance':
          reportData = performanceData || null;
          break;
        case 'invoices':
        case 'custom':
          reportData = invoicesData || null;
          break;
      }

      if (!reportData) {
        throw new Error('No data available for export');
      }

      // Export based on format
      const exportOptions = {
        reportType: reportType as 'operational' | 'financial' | 'performance' | 'invoices',
        data: reportData,
        dealershipName,
        startDate: filters.startDate,
        endDate: filters.endDate,
        includeSections: {
          summary: exportSections.summary,
          charts: exportSections.charts,
          tables: exportSections.tables,
        },
      };

      switch (exportFormat) {
        case 'pdf':
          await generateReportPDF(exportOptions);
          break;
        case 'excel':
          await generateReportExcel(exportOptions);
          break;
        case 'csv':
          await generateReportCSV(exportOptions);
          break;
      }

      toast({ description: t('reports.export.success_message') });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ variant: 'destructive', description: `${t('reports.export.error_message')}: ${errorMessage}` });
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleEmail = async () => {
    setIsExporting(true);
    try {
      // Simulate scheduling process
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ description: t('reports.export.schedule_success') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('reports.export.schedule_error') });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.export.configuration')}</CardTitle>
          <CardDescription>
            {t('reports.export.configuration_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('reports.export.format')}</Label>
              <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('reports.export.include_sections')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="summary"
                    checked={exportSections.summary}
                    onCheckedChange={(checked) =>
                      setExportSections(prev => ({ ...prev, summary: checked as boolean }))
                    }
                  />
                  <Label htmlFor="summary" className="text-sm">
                    {t('reports.export.summary_section')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charts"
                    checked={exportSections.charts}
                    onCheckedChange={(checked) =>
                      setExportSections(prev => ({ ...prev, charts: checked as boolean }))
                    }
                  />
                  <Label htmlFor="charts" className="text-sm">
                    {t('reports.export.charts_section')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tables"
                    checked={exportSections.tables}
                    onCheckedChange={(checked) =>
                      setExportSections(prev => ({ ...prev, tables: checked as boolean }))
                    }
                  />
                  <Label htmlFor="tables" className="text-sm">
                    {t('reports.export.tables_section')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trends"
                    checked={exportSections.trends}
                    onCheckedChange={(checked) =>
                      setExportSections(prev => ({ ...prev, trends: checked as boolean }))
                    }
                  />
                  <Label htmlFor="trends" className="text-sm">
                    {t('reports.export.trends_section')}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.export.available_reports')}</CardTitle>
          <CardDescription>
            {t('reports.export.available_reports_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportReports.map((report) => (
              <Card key={report.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {report.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExport(report.id)}
                      disabled={isExporting || !report.formats.includes(exportFormat)}
                      className="flex-1"
                      size="sm"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isExporting ? t('common.exporting') : t('reports.export.download')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.export.scheduled_reports')}</CardTitle>
          <CardDescription>
            {t('reports.export.scheduled_reports_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t('reports.export.email_reports')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('reports.export.email_reports_description')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleScheduleEmail}
              disabled={isExporting}
              variant="outline"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              {t('reports.export.schedule')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};