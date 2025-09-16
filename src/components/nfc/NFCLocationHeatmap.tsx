import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  TrendingUp, 
  Clock, 
  BarChart3,
  Zap,
  Users,
  Activity,
  ArrowUpDown,
  Filter,
  Calendar,
  Navigation
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNFCManagement } from '@/hooks/useNFCManagement';
import { cn } from '@/lib/utils';

interface NFCLocationHeatmapProps {
  className?: string;
}

interface LocationData {
  name: string;
  total_visits: number;
  avg_duration: number; // in minutes
  peak_hours: string;
  efficiency_score: number; // 0-100
  current_occupancy: number;
  max_capacity: number;
  recent_activity: number; // visits in last 24h
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

interface TrafficFlow {
  from: string;
  to: string;
  frequency: number;
  avg_transition_time: number; // in minutes
}

export function NFCLocationHeatmap({ className }: NFCLocationHeatmapProps) {
  const { t } = useTranslation();
  const { locationTags, loadTags } = useNFCManagement();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [sortBy, setSortBy] = useState<'visits' | 'duration' | 'efficiency'>('visits');

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Mock location data - in real app this would be calculated from NFC scans
  const mockLocationData: LocationData[] = [
    {
      name: 'Reception Area',
      total_visits: 145,
      avg_duration: 15,
      peak_hours: '9:00-11:00 AM',
      efficiency_score: 85,
      current_occupancy: 3,
      max_capacity: 8,
      recent_activity: 24,
      trend: 'up',
      trend_percentage: 12
    },
    {
      name: 'Service Bay 1',
      total_visits: 89,
      avg_duration: 120,
      peak_hours: '10:00-2:00 PM',
      efficiency_score: 92,
      current_occupancy: 2,
      max_capacity: 3,
      recent_activity: 18,
      trend: 'up',
      trend_percentage: 8
    },
    {
      name: 'Detail Bay A',
      total_visits: 67,
      avg_duration: 180,
      peak_hours: '11:00-3:00 PM',
      efficiency_score: 78,
      current_occupancy: 1,
      max_capacity: 2,
      recent_activity: 12,
      trend: 'stable',
      trend_percentage: 0
    },
    {
      name: 'Wash Bay 2',
      total_visits: 134,
      avg_duration: 45,
      peak_hours: '8:00-12:00 PM',
      efficiency_score: 88,
      current_occupancy: 0,
      max_capacity: 4,
      recent_activity: 22,
      trend: 'down',
      trend_percentage: -5
    },
    {
      name: 'Quality Check',
      total_visits: 95,
      avg_duration: 30,
      peak_hours: '1:00-4:00 PM',
      efficiency_score: 95,
      current_occupancy: 1,
      max_capacity: 3,
      recent_activity: 16,
      trend: 'up',
      trend_percentage: 15
    },
    {
      name: 'Ready for Pickup',
      total_visits: 78,
      avg_duration: 240,
      peak_hours: '3:00-6:00 PM',
      efficiency_score: 70,
      current_occupancy: 4,
      max_capacity: 10,
      recent_activity: 14,
      trend: 'stable',
      trend_percentage: 2
    }
  ];

  // Mock traffic flow data
  const mockTrafficFlow: TrafficFlow[] = [
    { from: 'Reception Area', to: 'Service Bay 1', frequency: 45, avg_transition_time: 5 },
    { from: 'Reception Area', to: 'Wash Bay 2', frequency: 38, avg_transition_time: 3 },
    { from: 'Service Bay 1', to: 'Detail Bay A', frequency: 32, avg_transition_time: 8 },
    { from: 'Wash Bay 2', to: 'Detail Bay A', frequency: 28, avg_transition_time: 2 },
    { from: 'Detail Bay A', to: 'Quality Check', frequency: 54, avg_transition_time: 5 },
    { from: 'Quality Check', to: 'Ready for Pickup', frequency: 52, avg_transition_time: 10 }
  ];

  // Sort locations based on selected criteria
  const sortedLocations = [...mockLocationData].sort((a, b) => {
    switch (sortBy) {
      case 'visits':
        return b.total_visits - a.total_visits;
      case 'duration':
        return b.avg_duration - a.avg_duration;
      case 'efficiency':
        return b.efficiency_score - a.efficiency_score;
      default:
        return 0;
    }
  });

  const getHeatmapIntensity = (visits: number) => {
    const maxVisits = Math.max(...mockLocationData.map(l => l.total_visits));
    const intensity = (visits / maxVisits) * 100;
    
    if (intensity >= 80) return 'bg-red-500 text-white';
    if (intensity >= 60) return 'bg-orange-500 text-white';
    if (intensity >= 40) return 'bg-yellow-500 text-black';
    if (intensity >= 20) return 'bg-green-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getOccupancyColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-warning';
    return 'text-success';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-destructive rotate-180" />;
      default: return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('nfc_tracking.location_heatmap.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('nfc_tracking.location_heatmap.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('24h')}
          >
            24h
          </Button>
          <Button
            variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('7d')}
          >
            7d
          </Button>
          <Button
            variant={selectedTimeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('30d')}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('nfc_tracking.location_heatmap.total_locations')}
                </p>
                <p className="text-2xl font-bold">{mockLocationData.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('nfc_tracking.location_heatmap.avg_efficiency')}
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(mockLocationData.reduce((acc, loc) => acc + loc.efficiency_score, 0) / mockLocationData.length)}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('nfc_tracking.location_heatmap.current_occupancy')}
                </p>
                <p className="text-2xl font-bold">
                  {mockLocationData.reduce((acc, loc) => acc + loc.current_occupancy, 0)}/
                  {mockLocationData.reduce((acc, loc) => acc + loc.max_capacity, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('nfc_tracking.location_heatmap.peak_activity')}
                </p>
                <p className="text-2xl font-bold">10-2 PM</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                {t('nfc_tracking.location_heatmap.activity_heatmap')}
              </CardTitle>
              
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'visits' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('visits')}
                >
                  {t('nfc_tracking.location_heatmap.visits')}
                </Button>
                <Button
                  variant={sortBy === 'duration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('duration')}
                >
                  {t('nfc_tracking.location_heatmap.duration')}
                </Button>
                <Button
                  variant={sortBy === 'efficiency' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('efficiency')}
                >
                  {t('nfc_tracking.location_heatmap.efficiency')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {sortedLocations.map((location) => (
                  <div
                    key={location.name}
                    className="p-4 rounded-lg border hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full",
                          getHeatmapIntensity(location.total_visits)
                        )} />
                        <div>
                          <h4 className="font-medium">{location.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t('nfc_tracking.location_heatmap.peak_hours')}: {location.peak_hours}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {location.total_visits} {t('nfc_tracking.location_heatmap.visits')}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs">
                          {getTrendIcon(location.trend)}
                          <span className={cn(
                            location.trend === 'up' ? 'text-success' :
                            location.trend === 'down' ? 'text-destructive' :
                            'text-muted-foreground'
                          )}>
                            {location.trend_percentage > 0 ? '+' : ''}{location.trend_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('nfc_tracking.location_heatmap.avg_duration')}</p>
                        <p className="font-medium">{location.avg_duration}m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('nfc_tracking.location_heatmap.efficiency')}</p>
                        <p className="font-medium">{location.efficiency_score}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('nfc_tracking.location_heatmap.occupancy')}</p>
                        <p className={cn(
                          "font-medium",
                          getOccupancyColor(location.current_occupancy, location.max_capacity)
                        )}>
                          {location.current_occupancy}/{location.max_capacity}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{t('nfc_tracking.location_heatmap.efficiency')}</span>
                        <span>{location.efficiency_score}%</span>
                      </div>
                      <Progress value={location.efficiency_score} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Traffic Flow Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              {t('nfc_tracking.location_heatmap.traffic_flow')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {mockTrafficFlow.map((flow, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{flow.from}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{flow.to}</span>
                      </div>
                      <Badge variant="secondary">
                        {flow.frequency} {t('nfc_tracking.location_heatmap.transitions')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>~{flow.avg_transition_time}m {t('nfc_tracking.location_heatmap.avg_time')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t('nfc_tracking.location_heatmap.insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <h4 className="font-medium text-success mb-2">
                {t('nfc_tracking.location_heatmap.peak_efficiency')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('nfc_tracking.location_heatmap.quality_check_insight')}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <h4 className="font-medium text-warning mb-2">
                {t('nfc_tracking.location_heatmap.bottleneck_detected')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('nfc_tracking.location_heatmap.detail_bay_bottleneck')}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-medium text-primary mb-2">
                {t('nfc_tracking.location_heatmap.optimization_opportunity')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('nfc_tracking.location_heatmap.reception_optimization')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}