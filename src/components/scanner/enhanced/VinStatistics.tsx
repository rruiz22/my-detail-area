import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle,
  Camera,
  Upload,
  Edit3,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format, isToday, isThisWeek, subDays } from 'date-fns';

interface VinStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  averageConfidence: number;
  scansToday: number;
  scansThisWeek: number;
  sourceBreakdown: {
    camera: number;
    upload: number;
    manual: number;
  };
  averageProcessingTime: number;
  successRate: number;
  dailyTrend: Array<{
    date: string;
    scans: number;
    success: number;
  }>;
}

interface VinStatisticsProps {
  className?: string;
  refreshTrigger?: number;
}

export function VinStatistics({ className, refreshTrigger }: VinStatisticsProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<VinStats>({
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    averageConfidence: 0,
    scansToday: 0,
    scansThisWeek: 0,
    sourceBreakdown: { camera: 0, upload: 0, manual: 0 },
    averageProcessingTime: 0,
    successRate: 0,
    dailyTrend: []
  });

  const calculateStats = () => {
    try {
      const storedHistory = localStorage.getItem('vinScannerHistory');
      if (!storedHistory) return;

      const history = JSON.parse(storedHistory);
      if (!Array.isArray(history) || history.length === 0) return;

      const totalScans = history.length;
      const validScans = history.filter((entry: any) => entry.isValid).length;
      const invalidScans = totalScans - validScans;

      // Calculate average confidence
      const totalConfidence = history.reduce((sum: number, entry: any) => sum + (entry.confidence || 0), 0);
      const averageConfidence = totalScans > 0 ? totalConfidence / totalScans : 0;

      // Calculate scans today and this week
      const scansToday = history.filter((entry: any) => 
        isToday(new Date(entry.scannedAt))
      ).length;

      const scansThisWeek = history.filter((entry: any) => 
        isThisWeek(new Date(entry.scannedAt))
      ).length;

      // Source breakdown
      const sourceBreakdown = history.reduce((acc: any, entry: any) => {
        const source = entry.source || 'manual';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, { camera: 0, upload: 0, manual: 0 });

      // Average processing time
      const entriesWithTime = history.filter((entry: any) => entry.processingTime);
      const averageProcessingTime = entriesWithTime.length > 0
        ? entriesWithTime.reduce((sum: number, entry: any) => sum + entry.processingTime, 0) / entriesWithTime.length
        : 0;

      // Success rate
      const successRate = totalScans > 0 ? (validScans / totalScans) * 100 : 0;

      // Daily trend (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const dayScans = history.filter((entry: any) => 
          format(new Date(entry.scannedAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        
        return {
          date: format(date, 'MMM dd'),
          scans: dayScans.length,
          success: dayScans.filter((entry: any) => entry.isValid).length
        };
      }).reverse();

      setStats({
        totalScans,
        validScans,
        invalidScans,
        averageConfidence,
        scansToday,
        scansThisWeek,
        sourceBreakdown,
        averageProcessingTime,
        successRate,
        dailyTrend: last7Days
      });
    } catch (error) {
      console.error('Error calculating VIN statistics:', error);
    }
  };

  useEffect(() => {
    calculateStats();
  }, [refreshTrigger]);

  useEffect(() => {
    calculateStats();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vinScannerHistory') {
        calculateStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'camera': return Camera;
      case 'upload': return Upload;
      case 'manual': return Edit3;
      default: return Edit3;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          VIN Scanner Statistics
        </CardTitle>
        <CardDescription>
          Performance metrics and usage analytics
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-primary/5 rounded-lg border">
            <div className="text-2xl font-bold text-primary">{stats.totalScans}</div>
            <div className="text-sm text-muted-foreground">Total Scans</div>
          </div>
          
          <div className="text-center p-4 bg-success/5 rounded-lg border">
            <div className="text-2xl font-bold text-success">{stats.validScans}</div>
            <div className="text-sm text-muted-foreground">Valid VINs</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg border">
            <div className="text-2xl font-bold">{stats.scansToday}</div>
            <div className="text-sm text-muted-foreground">Today</div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg border">
            <div className="text-2xl font-bold">{Math.round(stats.successRate)}%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Success Rate Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="font-medium">Success Rate</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.validScans}/{stats.totalScans} valid
            </span>
          </div>
          <Progress value={stats.successRate} className="h-3" />
        </div>

        {/* Average Confidence */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Average Confidence</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.round(stats.averageConfidence * 100)}%
            </span>
          </div>
          <Progress value={stats.averageConfidence * 100} className="h-3" />
        </div>

        {/* Source Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-medium">
            <Camera className="w-4 h-4" />
            Scan Sources
          </div>
          
          <div className="space-y-3">
            {Object.entries(stats.sourceBreakdown).map(([source, count]) => {
              const Icon = getSourceIcon(source);
              const percentage = stats.totalScans > 0 ? (count / stats.totalScans) * 100 : 0;
              
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{source}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Avg. Processing Time
            </div>
            <div className="text-lg font-bold">
              {stats.averageProcessingTime > 0 ? `${Math.round(stats.averageProcessingTime)}ms` : 'N/A'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              This Week
            </div>
            <div className="text-lg font-bold">
              {stats.scansThisWeek} scans
            </div>
          </div>
        </div>

        {/* Weekly Trend */}
        {stats.dailyTrend.some(day => day.scans > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-medium">
              <TrendingUp className="w-4 h-4" />
              Daily Activity (Last 7 Days)
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {stats.dailyTrend.map((day, index) => {
                const maxScans = Math.max(...stats.dailyTrend.map(d => d.scans));
                const height = maxScans > 0 ? (day.scans / maxScans) * 100 : 0;
                
                return (
                  <div key={index} className="text-center">
                    <div className="h-16 flex items-end justify-center mb-1">
                      <div
                        className="w-4 bg-primary rounded-t transition-all duration-300"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${day.date}: ${day.scans} scans, ${day.success} valid`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.date.split(' ')[1]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.totalScans === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 mb-4" />
            <p>No scanning data available yet</p>
            <p className="text-sm">Start scanning VINs to see statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}