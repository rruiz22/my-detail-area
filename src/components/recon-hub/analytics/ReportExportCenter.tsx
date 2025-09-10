import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Calendar, Filter, Settings, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { ReconOrderWithWorkflow } from '@/types/recon-hub';

interface ReportExportCenterProps {
  dealerId: number;
  orders: ReconOrderWithWorkflow[];
}

interface ReportConfig {
  type: 'summary' | 'detailed' | 'analytics' | 'custom';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    from: Date;
    to: Date;
  };
  includeMetrics: {
    t2lStats: boolean;
    bottlenecks: boolean;
    trends: boolean;
    costs: boolean;
    performance: boolean;
  };
  includeCharts: boolean;
  includeRawData: boolean;
}

const REPORT_TEMPLATES = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level KPIs and trends for leadership',
    type: 'summary' as const,
    icon: FileText,
    includes: ['Key metrics', 'Performance trends', 'Executive insights'],
    defaultConfig: {
      includeMetrics: { t2lStats: true, bottlenecks: true, trends: true, costs: true, performance: true },
      includeCharts: true,
      includeRawData: false
    }
  },
  {
    id: 'operational',
    name: 'Operational Report',
    description: 'Detailed operational metrics and bottleneck analysis',
    type: 'detailed' as const,
    icon: Settings,
    includes: ['Detailed workflow analysis', 'Bottleneck identification', 'Resource recommendations'],
    defaultConfig: {
      includeMetrics: { t2lStats: true, bottlenecks: true, trends: true, costs: true, performance: true },
      includeCharts: true,
      includeRawData: true
    }
  },
  {
    id: 'financial',
    name: 'Financial Analysis',
    description: 'Cost analysis and ROI metrics',
    type: 'analytics' as const,
    icon: Download,
    includes: ['Holding cost analysis', 'ROI calculations', 'Cost optimization opportunities'],
    defaultConfig: {
      includeMetrics: { t2lStats: true, bottlenecks: false, trends: true, costs: true, performance: false },
      includeCharts: true,
      includeRawData: false
    }
  },
  {
    id: 'performance',
    name: 'Performance Analytics',
    description: 'Comprehensive performance analysis with benchmarks',
    type: 'analytics' as const,
    icon: FileText,
    includes: ['Performance benchmarks', 'Historical comparisons', 'Predictive analytics'],
    defaultConfig: {
      includeMetrics: { t2lStats: true, bottlenecks: true, trends: true, costs: false, performance: true },
      includeCharts: true,
      includeRawData: false
    }
  }
];

export function ReportExportCenter({ dealerId, orders }: ReportExportCenterProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('executive');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [config, setConfig] = useState<ReportConfig>({
    type: 'summary',
    format: 'pdf',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    },
    includeMetrics: {
      t2lStats: true,
      bottlenecks: true,
      trends: true,
      costs: true,
      performance: true
    },
    includeCharts: true,
    includeRawData: false
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setConfig(prev => ({
        ...prev,
        type: template.type,
        includeMetrics: template.defaultConfig.includeMetrics,
        includeCharts: template.defaultConfig.includeCharts,
        includeRawData: template.defaultConfig.includeRawData
      }));
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call an API endpoint
      // that generates the report based on the configuration
      const reportData = {
        dealerId,
        config,
        orders: orders.filter(order => {
          const orderDate = new Date(order.t2lMetrics?.acquisition_date || new Date());
          return orderDate >= config.dateRange.from && orderDate <= config.dateRange.to;
        })
      };

      // For now, just show success message
      toast({
        title: t('reconHub.reports.generating', 'Report Generated Successfully'),
        description: t('reconHub.reports.downloadReady', 'Your report is ready for download'),
      });

      // In a real implementation, this would trigger a file download
      console.log('Generated report with config:', reportData);
      
    } catch (error) {
      toast({
        title: t('reconHub.reports.error', 'Export Error'),
        description: t('reconHub.reports.errorDesc', 'Failed to generate report. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleReport = () => {
    toast({
      title: t('reconHub.reports.scheduled', 'Report Scheduled'),
      description: t('reconHub.reports.scheduledDesc', 'Your report will be generated and emailed automatically'),
    });
  };

  const selectedTemplateData = REPORT_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('reconHub.reports.title', 'Report Export Center')}
          </CardTitle>
          <CardDescription>
            {t('reconHub.reports.description', 'Generate comprehensive reports and analytics for your reconditioning operations')}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Templates */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('reconHub.reports.templates', 'Report Templates')}
              </CardTitle>
              <CardDescription>
                {t('reconHub.reports.templatesDesc', 'Choose from pre-configured report templates')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REPORT_TEMPLATES.map((template) => {
                const IconComponent = template.icon;
                return (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.includes.slice(0, 2).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {template.includes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.includes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('reconHub.reports.configuration', 'Report Configuration')}
              </CardTitle>
              {selectedTemplateData && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    {t('reconHub.reports.templateSelected', 'Selected: {{name}} - {{description}}', {
                      name: selectedTemplateData.name,
                      description: selectedTemplateData.description
                    })}
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('reconHub.reports.dateRange', 'Date Range')}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('reconHub.reports.fromDate', 'From Date')}
                    </Label>
                    <Input
                      type="date"
                      value={config.dateRange.from.toISOString().split('T')[0]}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: new Date(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('reconHub.reports.toDate', 'To Date')}
                    </Label>
                    <Input
                      type="date"
                      value={config.dateRange.to.toISOString().split('T')[0]}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: new Date(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Format Selection */}
              <div className="space-y-3">
                <Label>{t('reconHub.reports.format', 'Export Format')}</Label>
                <Select 
                  value={config.format} 
                  onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Metrics Selection */}
              <div className="space-y-3">
                <Label>{t('reconHub.reports.includeMetrics', 'Include Metrics')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 't2lStats', label: 'T2L Statistics' },
                    { key: 'bottlenecks', label: 'Bottleneck Analysis' },
                    { key: 'trends', label: 'Performance Trends' },
                    { key: 'costs', label: 'Cost Analysis' },
                    { key: 'performance', label: 'Performance Metrics' }
                  ].map((metric) => (
                    <div key={metric.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.key}
                        checked={config.includeMetrics[metric.key as keyof typeof config.includeMetrics]}
                        onCheckedChange={(checked) => 
                          setConfig(prev => ({
                            ...prev,
                            includeMetrics: {
                              ...prev.includeMetrics,
                              [metric.key]: checked
                            }
                          }))
                        }
                      />
                      <Label htmlFor={metric.key} className="text-sm">
                        {metric.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Additional Options */}
              <div className="space-y-3">
                <Label>{t('reconHub.reports.additionalOptions', 'Additional Options')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCharts"
                      checked={config.includeCharts}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({ ...prev, includeCharts: !!checked }))
                      }
                    />
                    <Label htmlFor="includeCharts" className="text-sm">
                      {t('reconHub.reports.includeCharts', 'Include Charts and Visualizations')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeRawData"
                      checked={config.includeRawData}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({ ...prev, includeRawData: !!checked }))
                      }
                    />
                    <Label htmlFor="includeRawData" className="text-sm">
                      {t('reconHub.reports.includeRawData', 'Include Raw Data Appendix')}
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating 
                    ? t('reconHub.reports.generating', 'Generating...') 
                    : t('reconHub.reports.generate', 'Generate Report')
                  }
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleScheduleReport}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('reconHub.reports.schedule', 'Schedule Report')}
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Report Preview Info */}
              {orders.length > 0 && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    {t('reconHub.reports.preview', 'Report will include {{count}} orders from {{from}} to {{to}}', {
                      count: orders.filter(order => {
                        const orderDate = new Date(order.t2lMetrics?.acquisition_date || new Date());
                        return orderDate >= config.dateRange.from && orderDate <= config.dateRange.to;
                      }).length,
                      from: config.dateRange.from.toLocaleDateString(),
                      to: config.dateRange.to.toLocaleDateString()
                    })}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}