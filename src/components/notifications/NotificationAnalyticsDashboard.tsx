import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Activity,
  BarChart3
} from 'lucide-react';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useTranslation } from 'react-i18next';

interface NotificationAnalyticsDashboardProps {
  dealerId: number;
}

export function NotificationAnalyticsDashboard({ dealerId }: NotificationAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const { analytics, getChannelStats, loading } = useEnhancedNotifications(dealerId);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('volume');

  const channelIcons = {
    sms: MessageSquare,
    email: Mail,
    push: Smartphone,
    in_app: Bell
  };

  const channelColors = {
    sms: '#8B5CF6',
    email: '#06B6D4',
    push: '#F59E0B',
    in_app: '#10B981'
  };

  // Process analytics data
  const channelStats = getChannelStats();
  const totalSent = Object.values(channelStats).reduce((sum, stat) => sum + stat.sent, 0);
  const totalDelivered = Object.values(channelStats).reduce((sum, stat) => sum + stat.delivered, 0);
  const totalFailed = Object.values(channelStats).reduce((sum, stat) => sum + stat.failed, 0);

  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;

  // Channel performance data for charts
  const channelPerformanceData = Object.entries(channelStats).map(([channel, stats]) => ({
    channel: t(`notifications.channels.${channel}`),
    sent: stats.sent,
    delivered: stats.delivered,
    failed: stats.failed,
    deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0,
    color: channelColors[channel as keyof typeof channelColors]
  }));

  // Time series data (mock for now - would come from real analytics)
  const timeSeriesData = [
    { date: '2024-01-01', sms: 120, email: 200, push: 150, in_app: 80 },
    { date: '2024-01-02', sms: 150, email: 180, push: 170, in_app: 90 },
    { date: '2024-01-03', sms: 100, email: 220, push: 140, in_app: 100 },
    { date: '2024-01-04', sms: 180, email: 190, push: 160, in_app: 70 },
    { date: '2024-01-05', sms: 160, email: 210, push: 180, in_app: 85 },
    { date: '2024-01-06', sms: 140, email: 230, push: 150, in_app: 95 },
    { date: '2024-01-07', sms: 170, email: 250, push: 190, in_app: 110 }
  ];

  const pieData = channelPerformanceData.filter(item => item.sent > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('notifications.analytics.title')}</h2>
          <p className="text-muted-foreground">
            {t('notifications.analytics.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t('common.timeRange.24h')}</SelectItem>
              <SelectItem value="7d">{t('common.timeRange.7d')}</SelectItem>
              <SelectItem value="30d">{t('common.timeRange.30d')}</SelectItem>
              <SelectItem value="90d">{t('common.timeRange.90d')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.analytics.totalSent')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+12%</span>
              {t('common.fromPreviousPeriod')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.analytics.deliveryRate')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+2.3%</span>
              {t('common.fromPreviousPeriod')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.analytics.failureRate')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failureRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span className="text-red-600">-0.8%</span>
              {t('common.fromPreviousPeriod')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.analytics.avgResponseTime')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4s</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-green-600" />
              <span className="text-green-600">-0.3s</span>
              {t('common.fromPreviousPeriod')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
        <TabsList>
          <TabsTrigger value="volume">{t('notifications.analytics.volume')}</TabsTrigger>
          <TabsTrigger value="performance">{t('notifications.analytics.performance')}</TabsTrigger>
          <TabsTrigger value="distribution">{t('notifications.analytics.distribution')}</TabsTrigger>
          <TabsTrigger value="trends">{t('notifications.analytics.trends')}</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.analytics.volumeByChannel')}</CardTitle>
              <CardDescription>
                {t('notifications.analytics.volumeByChannelDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#3B82F6" name={t('notifications.analytics.sent')} />
                  <Bar dataKey="delivered" fill="#10B981" name={t('notifications.analytics.delivered')} />
                  <Bar dataKey="failed" fill="#EF4444" name={t('notifications.analytics.failed')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.analytics.deliveryRateByChannel')}</CardTitle>
              <CardDescription>
                {t('notifications.analytics.deliveryRateByChannelDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="deliveryRate" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications.analytics.channelDistribution')}</CardTitle>
                <CardDescription>
                  {t('notifications.analytics.channelDistributionDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sent"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('notifications.analytics.channelBreakdown')}</CardTitle>
                <CardDescription>
                  {t('notifications.analytics.channelBreakdownDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelPerformanceData.map((channel, index) => {
                    const Icon = channelIcons[Object.keys(channelIcons)[index] as keyof typeof channelIcons];
                    return (
                      <div key={channel.channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: channel.color }}
                          />
                          <Icon className="h-4 w-4" />
                          <span>{channel.channel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {channel.sent} {t('notifications.analytics.sent')}
                          </Badge>
                          <Badge 
                            variant={channel.deliveryRate > 90 ? 'default' : 'destructive'}
                          >
                            {channel.deliveryRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.analytics.notificationTrends')}</CardTitle>
              <CardDescription>
                {t('notifications.analytics.notificationTrendsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="sms" 
                    stackId="1" 
                    stroke={channelColors.sms} 
                    fill={channelColors.sms} 
                    name="SMS"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="email" 
                    stackId="1" 
                    stroke={channelColors.email} 
                    fill={channelColors.email} 
                    name="Email"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="push" 
                    stackId="1" 
                    stroke={channelColors.push} 
                    fill={channelColors.push} 
                    name="Push"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="in_app" 
                    stackId="1" 
                    stroke={channelColors.in_app} 
                    fill={channelColors.in_app} 
                    name="In-App"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}