import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Radio, 
  Car, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Activity,
  Zap,
  Users,
  Target
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNFCManagement } from '@/hooks/useNFCManagement';
import { NFCGeolocationMap } from './NFCGeolocationMap';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NFCDashboardProps {
  className?: string;
}

export function NFCDashboard({ className }: NFCDashboardProps) {
  const { t, i18n } = useTranslation();
  const { stats, loading, loadStats } = useNFCManagement();

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    progress,
    trend 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    progress?: number;
    trend?: { value: number; label: string };
  }) => (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("w-8 h-8 rounded-full bg-muted flex items-center justify-center", color)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress}% active</p>
          </div>
        )}
        
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-success" />
            <span className="text-xs font-medium text-success">
              +{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !stats) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/2 mb-2" />
              <div className="h-2 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeRate = stats ? (stats.active_tags / stats.total_tags) * 100 : 0;
  const scanEfficiency = stats ? (stats.unique_scans / stats.total_scans) * 100 : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={t('nfc_tracking.dashboard.active_tags')}
          value={stats?.active_tags || 0}
          icon={<Radio className="w-4 h-4" />}
          color="text-primary"
          progress={activeRate}
          trend={{ value: 12, label: t('nfc_tracking.dashboard.this_week') }}
        />
        
        <MetricCard
          title={t('nfc_tracking.dashboard.vehicles_tracked')}
          value={stats?.vehicles_tracked || 0}
          icon={<Car className="w-4 h-4" />}
          color="text-success"
          trend={{ value: 8, label: t('nfc_tracking.dashboard.this_week') }}
        />
        
        <MetricCard
          title={t('nfc_tracking.dashboard.locations')}
          value={stats?.locations_count || 0}
          icon={<MapPin className="w-4 h-4" />}
          color="text-warning"
        />
        
        <MetricCard
          title={t('nfc_tracking.dashboard.avg_stay_time')}
          value={`${stats?.avg_stay_time || 0}m`}
          icon={<Clock className="w-4 h-4" />}
          color="text-secondary"
          trend={{ value: -5, label: t('nfc_tracking.dashboard.improvement') }}
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t('nfc_tracking.dashboard.scan_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-primary">{stats?.total_scans || 0}</div>
                <p className="text-sm text-muted-foreground">{t('nfc_tracking.dashboard.total_scans')}</p>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-success">{stats?.unique_scans || 0}</div>
                <p className="text-sm text-muted-foreground">{t('nfc_tracking.dashboard.unique_scans')}</p>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-warning">{scanEfficiency.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">{t('nfc_tracking.dashboard.scan_efficiency')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('nfc_tracking.dashboard.scan_efficiency')}</span>
                <span>{scanEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={scanEfficiency} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              {t('nfc_tracking.dashboard.recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {stats?.recent_scans.map((scan, index) => (
                  <div key={scan.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {t('nfc_tracking.dashboard.tag_scanned')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scan.action_type} • {formatDistanceToNow(new Date(scan.scanned_at), { 
                          addSuffix: true, 
                          locale: getLocale() 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {!stats?.recent_scans.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('nfc_tracking.dashboard.no_recent_activity')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              {t('nfc_tracking.dashboard.system_performance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('nfc_tracking.dashboard.tag_reliability')}</span>
                <span className="text-sm font-medium">98.5%</span>
              </div>
              <Progress value={98.5} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('nfc_tracking.dashboard.scan_success_rate')}</span>
                <span className="text-sm font-medium">96.2%</span>
              </div>
              <Progress value={96.2} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('nfc_tracking.dashboard.response_time')}</span>
                <span className="text-sm font-medium">125ms</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              {t('nfc_tracking.dashboard.usage_insights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{t('nfc_tracking.dashboard.peak_hours')}</p>
                  <p className="text-xs text-muted-foreground">9:00 AM - 12:00 PM</p>
                </div>
                <Badge variant="secondary">+45%</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{t('nfc_tracking.dashboard.most_active_area')}</p>
                  <p className="text-xs text-muted-foreground">{t('nfc_tracking.dashboard.service_bay_2')}</p>
                </div>
                <Badge variant="secondary">142 scans</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{t('nfc_tracking.dashboard.avg_process_time')}</p>
                  <p className="text-xs text-muted-foreground">{t('nfc_tracking.dashboard.per_vehicle')}</p>
                </div>
                <Badge variant="outline">2.4 hours</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Geolocation Map */}
      <NFCGeolocationMap />
    </div>
  );
}