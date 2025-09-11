import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Upload, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Stock = () => {
  const { t } = useTranslation();

  const handleUploadCSV = () => {
    // TODO: Implement CSV upload modal
    console.log('Open CSV upload modal');
  };

  const handleViewAnalytics = () => {
    // TODO: Implement analytics view
    console.log('Open analytics view');
  };

  const mockMetrics = [
    {
      title: t('stock.metrics.totalVehicles'),
      value: '247',
      change: '+12',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: t('stock.metrics.avgAge'),
      value: '45 days',
      change: '-3 days',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: t('stock.metrics.totalValue'),
      value: '$8.2M',
      change: '+$450K',
      icon: FileText,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('stock.title')}</h1>
          <p className="text-muted-foreground">
            {t('stock.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUploadCSV} className="gap-2">
            <Upload className="h-4 w-4" />
            {t('stock.uploadCSV')}
          </Button>
          <Button variant="outline" onClick={handleViewAnalytics}>
            {t('stock.analytics')}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {metric.change}
                </Badge>
                from last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stock.inventory.title')}</CardTitle>
          <CardDescription>
            {t('stock.inventory.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {t('stock.placeholder.title')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('stock.placeholder.description')}
              </p>
              <Button onClick={handleUploadCSV}>
                {t('stock.placeholder.action')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stock;