import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Clock, Zap, Activity, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanMetrics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  averageConfidence: number;
  averageProcessingTime: number;
  sourceDistribution: { [key: string]: number };
  dailyScans: { date: string; scans: number; success: number }[];
  confidenceDistribution: { range: string; count: number }[];
}

interface ScannerAnalyticsProps {
  className?: string;
}

export function ScannerAnalytics({ className }: ScannerAnalyticsProps) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<ScanMetrics>({
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    averageConfidence: 0,
    averageProcessingTime: 0,
    sourceDistribution: {},
    dailyScans: [],
    confidenceDistribution: []
  });

  // Load and calculate metrics from localStorage
  useEffect(() => {
    const calculateMetrics = () => {
      const storedHistory = localStorage.getItem('vinScannerHistory');
      if (!storedHistory) return;

      try {
        const history = JSON.parse(storedHistory);
        const totalScans = history.length;
        const successfulScans = history.filter((entry: any) => entry.status === 'success').length;
        const failedScans = totalScans - successfulScans;
        
        const averageConfidence = history.reduce((sum: number, entry: any) => sum + entry.confidence, 0) / totalScans || 0;
        const averageProcessingTime = history.reduce((sum: number, entry: any) => sum + entry.processingTime, 0) / totalScans || 0;
        
        // Source distribution
        const sourceDistribution = history.reduce((acc: any, entry: any) => {
          acc[entry.source] = (acc[entry.source] || 0) + 1;
          return acc;
        }, {});

        // Daily scans for last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const dailyScans = last7Days.map(date => {
          const dayScans = history.filter((entry: any) => 
            new Date(entry.timestamp).toISOString().split('T')[0] === date
          );
          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            scans: dayScans.length,
            success: dayScans.filter((entry: any) => entry.status === 'success').length
          };
        });

        // Confidence distribution
        const confidenceRanges = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
        const confidenceDistribution = confidenceRanges.map((range, index) => {
          const min = index * 0.2;
          const max = (index + 1) * 0.2;
          const count = history.filter((entry: any) => 
            entry.confidence >= min && entry.confidence < max
          ).length;
          return { range, count };
        });

        setMetrics({
          totalScans,
          successfulScans,
          failedScans,
          averageConfidence,
          averageProcessingTime,
          sourceDistribution,
          dailyScans,
          confidenceDistribution
        });
      } catch (error) {
        console.error('Error calculating metrics:', error);
      }
    };

    calculateMetrics();
    
    // Recalculate when localStorage changes
    const handleStorageChange = () => calculateMetrics();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const successRate = metrics.totalScans > 0 ? (metrics.successfulScans / metrics.totalScans) * 100 : 0;

  const sourceChartData = Object.entries(metrics.sourceDistribution).map(([source, count]) => ({
    name: t(`vin_scanner_history.source_${source}`),
    value: count,
    percentage: metrics.totalScans > 0 ? ((count / metrics.totalScans) * 100).toFixed(1) : 0
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    description,
    valueClassName = '' 
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    description?: string;
    valueClassName?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold mt-2", valueClassName)}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            {trend && (
              <Badge 
                variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
                className="mt-2 text-xs"
              >
                <TrendingUp className={cn("w-3 h-3 mr-1", trend === 'down' && "rotate-180")} />
                {trend}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('scanner_analytics.total_scans')}
          value={metrics.totalScans}
          icon={Activity}
          trend="up"
        />
        <StatCard
          title={t('scanner_analytics.success_rate')}
          value={`${successRate.toFixed(1)}%`}
          icon={Target}
          trend={successRate >= 80 ? 'up' : successRate >= 60 ? 'neutral' : 'down'}
          valueClassName={successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}
        />
        <StatCard
          title={t('scanner_analytics.avg_confidence')}
          value={`${(metrics.averageConfidence * 100).toFixed(1)}%`}
          icon={Zap}
          trend={metrics.averageConfidence >= 0.8 ? 'up' : 'neutral'}
        />
        <StatCard
          title={t('scanner_analytics.avg_processing_time')}
          value={`${metrics.averageProcessingTime.toFixed(0)}ms`}
          icon={Clock}
          trend={metrics.averageProcessingTime <= 2000 ? 'up' : 'down'}
          description={t('scanner_analytics.processing_time_desc')}
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="overview">{t('scanner_analytics.overview')}</TabsTrigger>
          <TabsTrigger value="trends">{t('scanner_analytics.trends')}</TabsTrigger>
          <TabsTrigger value="performance">{t('scanner_analytics.performance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {t('scanner_analytics.source_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sourceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [`${value} (${sourceChartData.find(d => d.name === name)?.percentage}%)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('scanner_analytics.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confidence Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('scanner_analytics.confidence_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.confidenceDistribution.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.confidenceDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('scanner_analytics.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t('scanner_analytics.daily_scan_trends')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.dailyScans.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.dailyScans}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="scans" 
                        stroke="hsl(var(--primary))" 
                        name={t('scanner_analytics.total_scans')}
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="success" 
                        stroke="hsl(var(--success))" 
                        name={t('scanner_analytics.successful_scans')}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  {t('scanner_analytics.no_data')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('scanner_analytics.performance_metrics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('scanner_analytics.processing_speed')}</span>
                    <span>{metrics.averageProcessingTime.toFixed(0)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min(100, Math.max(0, 100 - (metrics.averageProcessingTime / 50)))} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('scanner_analytics.accuracy_rate')}</span>
                    <span>{(metrics.averageConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metrics.averageConfidence * 100} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('scanner_analytics.success_rate')}</span>
                    <span>{successRate.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={successRate} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('scanner_analytics.recommendations')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {successRate < 80 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      {t('scanner_analytics.recommendation_success_rate')}
                    </p>
                  </div>
                )}
                
                {metrics.averageProcessingTime > 3000 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      {t('scanner_analytics.recommendation_processing_time')}
                    </p>
                  </div>
                )}
                
                {metrics.averageConfidence < 0.7 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {t('scanner_analytics.recommendation_confidence')}
                    </p>
                  </div>
                )}

                {successRate >= 90 && metrics.averageProcessingTime <= 2000 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      {t('scanner_analytics.recommendation_excellent')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}