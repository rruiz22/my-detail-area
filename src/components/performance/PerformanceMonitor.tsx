import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Cpu, 
  Database, 
  Globe, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Users,
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  database: number;
  network: number;
  response_time: number;
  error_rate: number;
  active_users: number;
  requests_per_minute: number;
  cache_hit_rate: number;
  uptime: number;
}

interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface PerformanceMonitorProps {
  dealerId?: number;
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  dealerId,
  className = ''
}) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpu: 45,
    memory: 62,
    database: 38,
    network: 78,
    response_time: 142,
    error_rate: 0.2,
    active_users: 234,
    requests_per_minute: 1247,
    cache_hit_rate: 94.5,
    uptime: 99.8
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'High Memory Usage',
      description: 'Memory usage is above 60%. Consider optimizing or scaling.',
      timestamp: new Date().toISOString(),
      resolved: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Cache Performance',
      description: 'Cache hit rate is excellent at 94.5%.',
      timestamp: new Date().toISOString(),
      resolved: true
    }
  ]);

  const [historicalData, setHistoricalData] = useState([
    { time: '00:00', cpu: 35, memory: 45, response: 120, users: 180 },
    { time: '04:00', cpu: 28, memory: 42, response: 110, users: 95 },
    { time: '08:00', cpu: 52, memory: 58, response: 150, users: 320 },
    { time: '12:00', cpu: 48, memory: 65, response: 145, users: 410 },
    { time: '16:00', cpu: 45, memory: 62, response: 142, users: 380 },
    { time: '20:00', cpu: 38, memory: 55, response: 135, users: 290 }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
        database: Math.max(10, Math.min(80, prev.database + (Math.random() - 0.5) * 12)),
        network: Math.max(40, Math.min(100, prev.network + (Math.random() - 0.5) * 15)),
        response_time: Math.max(80, Math.min(300, prev.response_time + (Math.random() - 0.5) * 20)),
        error_rate: Math.max(0, Math.min(5, prev.error_rate + (Math.random() - 0.5) * 0.5)),
        active_users: Math.max(50, Math.min(500, prev.active_users + Math.floor((Math.random() - 0.5) * 20))),
        requests_per_minute: Math.max(500, Math.min(2000, prev.requests_per_minute + Math.floor((Math.random() - 0.5) * 100)))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }, reverse = false) => {
    if (reverse) {
      if (value < thresholds.critical) return 'text-red-600';
      if (value < thresholds.warning) return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (value > thresholds.critical) return 'text-red-600';
      if (value > thresholds.warning) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const getStatusBadge = (value: number, thresholds: { warning: number; critical: number }, reverse = false) => {
    if (reverse) {
      if (value < thresholds.critical) return <Badge variant="destructive">Critical</Badge>;
      if (value < thresholds.warning) return <Badge variant="secondary">Warning</Badge>;
      return <Badge variant="default">Good</Badge>;
    } else {
      if (value > thresholds.critical) return <Badge variant="destructive">Critical</Badge>;
      if (value > thresholds.warning) return <Badge variant="secondary">Warning</Badge>;
      return <Badge variant="default">Good</Badge>;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('performance.monitor', 'Performance Monitor')}</h2>
          <p className="text-muted-foreground">
            {t('performance.real_time_metrics', 'Real-time system performance and health metrics')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {t('performance.live', 'Live')}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('performance.cpu_usage', 'CPU Usage')}
          value={`${metrics.cpu.toFixed(1)}%`}
          icon={Cpu}
          progress={metrics.cpu}
          status={getStatusBadge(metrics.cpu, { warning: 70, critical: 85 })}
          trend={2.3}
        />
        <MetricCard
          title={t('performance.memory_usage', 'Memory Usage')}
          value={`${metrics.memory.toFixed(1)}%`}
          icon={Activity}
          progress={metrics.memory}
          status={getStatusBadge(metrics.memory, { warning: 75, critical: 90 })}
          trend={-1.2}
        />
        <MetricCard
          title={t('performance.database_load', 'Database Load')}
          value={`${metrics.database.toFixed(1)}%`}
          icon={Database}
          progress={metrics.database}
          status={getStatusBadge(metrics.database, { warning: 60, critical: 80 })}
          trend={0.8}
        />
        <MetricCard
          title={t('performance.network_usage', 'Network Usage')}
          value={`${metrics.network.toFixed(1)}%`}
          icon={Globe}
          progress={metrics.network}
          status={getStatusBadge(metrics.network, { warning: 80, critical: 95 })}
          trend={-3.1}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {t('performance.response_time', 'Response Time')}
                </span>
              </div>
              {getStatusBadge(metrics.response_time, { warning: 200, critical: 300 })}
            </div>
            <div className="text-2xl font-bold mt-2">
              {metrics.response_time}ms
            </div>
            <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3" />
              12% faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {t('performance.error_rate', 'Error Rate')}
                </span>
              </div>
              {getStatusBadge(metrics.error_rate, { warning: 1, critical: 2 })}
            </div>
            <div className="text-2xl font-bold mt-2">
              {metrics.error_rate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  {t('performance.active_users', 'Active Users')}
                </span>
              </div>
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="text-2xl font-bold mt-2">
              {metrics.active_users.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +15% today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {t('performance.cache_hit_rate', 'Cache Hit')}
                </span>
              </div>
              {getStatusBadge(metrics.cache_hit_rate, { warning: 80, critical: 70 }, true)}
            </div>
            <div className="text-2xl font-bold mt-2">
              {metrics.cache_hit_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle className="h-3 w-3" />
              Excellent
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">{t('performance.charts', 'Charts')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('performance.alerts', 'Alerts')}</TabsTrigger>
          <TabsTrigger value="logs">{t('performance.logs', 'Logs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('performance.system_resources', 'System Resources')}
                </CardTitle>
                <CardDescription>
                  {t('performance.cpu_memory_over_time', 'CPU and Memory usage over time')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time & Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('performance.response_and_load', 'Response Time & Load')}
                </CardTitle>
                <CardDescription>
                  {t('performance.response_time_vs_users', 'Response time correlation with active users')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="response" stroke="#ff7300" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.type === 'critical' ? 'border-l-red-500' :
                alert.type === 'warning' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {alert.type === 'critical' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.resolved ? "default" : "destructive"}>
                      {alert.resolved ? t('performance.resolved', 'Resolved') : t('performance.active', 'Active')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('performance.system_logs', 'System Logs')}</CardTitle>
              <CardDescription>
                {t('performance.recent_system_events', 'Recent system events and performance logs')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex gap-4 text-xs text-muted-foreground border-b pb-2">
                  <span className="w-20">Time</span>
                  <span className="w-16">Level</span>
                  <span className="flex-1">Message</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="w-20">14:32:15</span>
                  <Badge variant="outline" className="w-16 text-xs">INFO</Badge>
                  <span className="flex-1">Cache warming completed successfully</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="w-20">14:31:42</span>
                  <Badge variant="secondary" className="w-16 text-xs">WARN</Badge>
                  <span className="flex-1">Memory usage approaching threshold (62%)</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="w-20">14:30:08</span>
                  <Badge variant="outline" className="w-16 text-xs">INFO</Badge>
                  <span className="flex-1">Database connection pool optimized</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="w-20">14:28:55</span>
                  <Badge variant="destructive" className="w-16 text-xs">ERROR</Badge>
                  <span className="flex-1">Failed to connect to external API (retry in 30s)</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="w-20">14:27:12</span>
                  <Badge variant="outline" className="w-16 text-xs">INFO</Badge>
                  <span className="flex-1">Auto-scaling triggered: +2 instances</span>
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
  icon: React.ComponentType<any>;
  progress: number;
  status: React.ReactNode;
  trend: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, progress, status, trend }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {status}
        </div>
        <div className="text-2xl font-bold mb-2">{value}</div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-muted-foreground">vs last hour</span>
        </div>
      </CardContent>
    </Card>
  );
};