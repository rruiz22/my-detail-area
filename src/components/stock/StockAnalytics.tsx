import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStockManagement } from '@/hooks/useStockManagement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Car,
  BarChart3,
  PieChart as PieChartIcon,
  Download
} from 'lucide-react';

export const StockAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { loading } = useStockManagement();
  const [timeRange, setTimeRange] = useState('30');
  const [chartType, setChartType] = useState('bar');

  // Mock data - replace with real analytics data
  const inventoryByMake = [
    { name: 'Toyota', count: 45, value: 1250000 },
    { name: 'Honda', count: 38, value: 980000 },
    { name: 'Ford', count: 32, value: 850000 },
    { name: 'Chevrolet', count: 28, value: 720000 },
    { name: 'Nissan', count: 25, value: 650000 },
  ];

  const priceDistribution = [
    { range: '$0-20K', count: 35, percentage: 25.7 },
    { range: '$20-40K', count: 48, percentage: 35.3 },
    { range: '$40-60K', count: 32, percentage: 23.5 },
    { range: '$60-80K', count: 15, percentage: 11.0 },
    { range: '$80K+', count: 6, percentage: 4.4 },
  ];

  const ageAnalysis = [
    { ageRange: '0-30 days', count: 45, avgPrice: 32500 },
    { ageRange: '31-60 days', count: 38, avgPrice: 29800 },
    { ageRange: '61-90 days', count: 25, avgPrice: 27200 },
    { ageRange: '91-120 days', count: 18, avgPrice: 24500 },
    { ageRange: '120+ days', count: 12, avgPrice: 21800 },
  ];

  const trendData = [
    { month: 'Jan', inventory: 145, avgPrice: 28500, turnover: 12 },
    { month: 'Feb', inventory: 138, avgPrice: 29200, turnover: 15 },
    { month: 'Mar', inventory: 152, avgPrice: 30100, turnover: 18 },
    { month: 'Apr', inventory: 148, avgPrice: 31200, turnover: 16 },
    { month: 'May', inventory: 156, avgPrice: 32100, turnover: 19 },
    { month: 'Jun', inventory: 163, avgPrice: 33000, turnover: 21 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const keyMetrics = [
    {
      title: t('stock.analytics.avg_inventory_value'),
      value: '$4.2M',
      change: '+8.5%',
      positive: true,
      icon: DollarSign
    },
    {
      title: t('stock.analytics.avg_days_in_stock'),
      value: '42 days',
      change: '-5 days',
      positive: true,
      icon: Calendar
    },
    {
      title: t('stock.analytics.inventory_turnover'),
      value: '8.5x',
      change: '+1.2x',
      positive: true,
      icon: TrendingUp
    },
    {
      title: t('stock.analytics.total_vehicles'),
      value: '163',
      change: '+12',
      positive: true,
      icon: Car
    }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('stock.analytics.last_7_days')}</SelectItem>
              <SelectItem value="30">{t('stock.analytics.last_30_days')}</SelectItem>
              <SelectItem value="90">{t('stock.analytics.last_90_days')}</SelectItem>
              <SelectItem value="365">{t('stock.analytics.last_year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          {t('stock.analytics.export_report')}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <metric.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <Badge variant={metric.positive ? "default" : "destructive"} className="text-xs">
                      {metric.positive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {metric.change}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by Make */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>{t('stock.analytics.inventory_by_make')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryByMake}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? `${value} vehicles` : `$${(value as number).toLocaleString()}`,
                    name === 'count' ? 'Count' : 'Value'
                  ]}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5" />
              <span>{t('stock.analytics.price_distribution')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percentage }) => `${range} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {priceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} vehicles`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>{t('stock.analytics.age_analysis')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageRange" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? `${value} vehicles` : `$${(value as number).toLocaleString()}`,
                    name === 'count' ? 'Count' : 'Avg Price'
                  ]}
                />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>{t('stock.analytics.inventory_trends')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'inventory' ? `${value} vehicles` : 
                    name === 'avgPrice' ? `$${(value as number).toLocaleString()}` :
                    `${value}x`,
                    name === 'inventory' ? 'Inventory' :
                    name === 'avgPrice' ? 'Avg Price' : 'Turnover'
                  ]}
                />
                <Line type="monotone" dataKey="inventory" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="turnover" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};