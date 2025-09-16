import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Users, 
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie } from 'recharts';

interface CommunicationAnalyticsDashboardProps {
  dealerId: number;
  timeRange?: '24h' | '7d' | '30d' | '90d';
}

export const CommunicationAnalyticsDashboard: React.FC<CommunicationAnalyticsDashboardProps> = ({
  dealerId,
  timeRange = '7d'
}) => {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - in real implementation, this would come from hooks/API
  const metrics = {
    totalMessages: 2847,
    responseTime: 12.3,
    satisfaction: 94.2,
    activeConversations: 34,
    resolvedIssues: 89,
    automationRate: 67
  };

  const trendData = [
    { time: '00:00', messages: 45, responses: 42, satisfaction: 92 },
    { time: '04:00', messages: 28, responses: 26, satisfaction: 94 },
    { time: '08:00', messages: 156, responses: 149, satisfaction: 91 },
    { time: '12:00', messages: 234, responses: 228, satisfaction: 96 },
    { time: '16:00', messages: 189, responses: 185, satisfaction: 95 },
    { time: '20:00', messages: 98, responses: 94, satisfaction: 93 }
  ];

  const channelData = [
    { name: 'SMS', value: 45, color: '#8884d8' },
    { name: 'Chat', value: 32, color: '#82ca9d' },
    { name: 'Email', value: 18, color: '#ffc658' },
    { name: 'Phone', value: 5, color: '#ff7300' }
  ];

  const performanceData = [
    { category: 'Response Time', current: 12.3, target: 15, trend: -8.2 },
    { category: 'First Contact Resolution', current: 89, target: 85, trend: 4.1 },
    { category: 'Customer Satisfaction', current: 94.2, target: 90, trend: 2.3 },
    { category: 'Automation Success', current: 67, target: 60, trend: 12.5 }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.communication_dashboard', 'Communication Analytics')}</h2>
          <p className="text-muted-foreground">{t('analytics.real_time_insights', 'Real-time insights into your communication performance')}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title={t('analytics.total_messages', 'Total Messages')}
          value={metrics.totalMessages.toLocaleString()}
          icon={MessageSquare}
          trend={12.5}
          color="blue"
        />
        <MetricCard
          title={t('analytics.avg_response_time', 'Avg Response Time')}
          value={`${metrics.responseTime}m`}
          icon={Clock}
          trend={-8.2}
          color="green"
        />
        <MetricCard
          title={t('analytics.satisfaction_score', 'Satisfaction Score')}
          value={`${metrics.satisfaction}%`}
          icon={CheckCircle}
          trend={2.3}
          color="emerald"
        />
        <MetricCard
          title={t('analytics.active_conversations', 'Active Conversations')}
          value={metrics.activeConversations.toString()}
          icon={Users}
          trend={-5.1}
          color="orange"
        />
        <MetricCard
          title={t('analytics.resolved_issues', 'Resolved Issues')}
          value={`${metrics.resolvedIssues}%`}
          icon={CheckCircle}
          trend={4.1}
          color="green"
        />
        <MetricCard
          title={t('analytics.automation_rate', 'Automation Rate')}
          value={`${metrics.automationRate}%`}
          icon={Activity}
          trend={12.5}
          color="purple"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('analytics.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="channels">{t('analytics.channels', 'Channels')}</TabsTrigger>
          <TabsTrigger value="performance">{t('analytics.performance', 'Performance')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('analytics.predictions', 'Predictions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Message Volume Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('analytics.message_volume', 'Message Volume')}
                </CardTitle>
                <CardDescription>
                  {t('analytics.messages_over_time', 'Messages and responses over time')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="messages" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="responses" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Satisfaction Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('analytics.satisfaction_trend', 'Satisfaction Trend')}
                </CardTitle>
                <CardDescription>
                  {t('analytics.customer_satisfaction_over_time', 'Customer satisfaction over time')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="satisfaction" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {t('analytics.channel_distribution', 'Channel Distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {channelData.map((channel) => (
                    <Badge key={channel.name} variant="outline" className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel.color }} />
                      {channel.name}: {channel.value}%
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.channel_performance', 'Channel Performance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelData.map((channel) => (
                    <div key={channel.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{channel.name}</span>
                        <span>{channel.value}%</span>
                      </div>
                      <Progress value={channel.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {performanceData.map((metric) => (
              <Card key={metric.category}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{metric.category}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{metric.current}</span>
                        <Badge variant={metric.trend > 0 ? "default" : "secondary"} className="flex items-center gap-1">
                          <ArrowUpRight className={`h-3 w-3 ${metric.trend < 0 ? 'rotate-90' : ''}`} />
                          {Math.abs(metric.trend)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target: {metric.target}</p>
                      <Progress 
                        value={Math.min((metric.current / metric.target) * 100, 100)} 
                        className="w-24 h-2 mt-1" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('analytics.predictive_insights', 'Predictive Insights')}
              </CardTitle>
              <CardDescription>
                {t('analytics.ai_powered_predictions', 'AI-powered predictions and recommendations')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    {t('analytics.peak_volume_warning', 'Peak Volume Expected')}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('analytics.peak_volume_description', 'Based on historical data, expect 40% increase in message volume tomorrow between 2-4 PM.')}
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    {t('analytics.automation_opportunity', 'Automation Opportunity')}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {t('analytics.automation_description', '23% of incoming messages could be automated with improved workflows.')}
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    {t('analytics.satisfaction_improvement', 'Satisfaction Improvement')}
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t('analytics.satisfaction_description', 'Response time improvements could increase satisfaction by 12%.')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const trendColor = trend > 0 ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend > 0 ? '↗' : '↘';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <Icon className={`h-4 w-4 text-${color}-600`} />
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendIcon} {Math.abs(trend)}%
          </span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
};