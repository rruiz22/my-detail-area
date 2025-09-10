import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, Filter, Search, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ColorTriggerAlert } from '@/types/recon-hub';

interface ColorTriggerReportProps {
  alerts: ColorTriggerAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  loading?: boolean;
}

export function ColorTriggerReport({ alerts, summary, loading = false }: ColorTriggerReportProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'daysOverdue' | 'severity' | 'vehicleInfo'>('daysOverdue');

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(alert => 
        alert.vehicleInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.stepName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Sort alerts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'daysOverdue':
          return b.daysOverdue - a.daysOverdue;
        case 'severity':
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case 'vehicleInfo':
          return a.vehicleInfo.localeCompare(b.vehicleInfo);
        default:
          return 0;
      }
    });

    return filtered;
  }, [alerts, searchTerm, severityFilter, sortBy]);

  const getColorClass = (color: ColorTriggerAlert['color']) => {
    switch (color) {
      case 'red':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'yellow':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-muted-foreground bg-muted/50 border-muted';
    }
  };

  const getSeverityBadgeVariant = (severity: ColorTriggerAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🚦 {t('reconHub.alerts.colorTriggerReport', 'Color Trigger Report')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.alerts.description', 'Real-time alerts for vehicles requiring attention')}
            </CardDescription>
          </div>
          
          {/* Summary Badges */}
          <div className="flex items-center gap-2">
            {summary.critical > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.critical} Critical
              </Badge>
            )}
            {summary.high > 0 && (
              <Badge variant="destructive" className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">
                {summary.high} High
              </Badge>
            )}
            {summary.medium > 0 && (
              <Badge variant="secondary" className="text-xs">
                {summary.medium} Medium
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('reconHub.alerts.searchPlaceholder', 'Search vehicles or steps...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reconHub.alerts.allSeverities', 'All')}</SelectItem>
              <SelectItem value="critical">{t('reconHub.alerts.critical', 'Critical')}</SelectItem>
              <SelectItem value="high">{t('reconHub.alerts.high', 'High')}</SelectItem>
              <SelectItem value="medium">{t('reconHub.alerts.medium', 'Medium')}</SelectItem>
              <SelectItem value="low">{t('reconHub.alerts.low', 'Low')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daysOverdue">{t('reconHub.alerts.sortByDays', 'Days Overdue')}</SelectItem>
              <SelectItem value="severity">{t('reconHub.alerts.sortBySeverity', 'Severity')}</SelectItem>
              <SelectItem value="vehicleInfo">{t('reconHub.alerts.sortByVehicle', 'Vehicle')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alerts Table */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || severityFilter !== 'all' ? 
                t('reconHub.alerts.noFilteredResults', 'No alerts match your filters') :
                t('reconHub.alerts.noAlerts', 'No alerts at this time')
              }
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || severityFilter !== 'all' ? 
                t('reconHub.alerts.tryDifferentFilters', 'Try adjusting your filters to see more results') :
                t('reconHub.alerts.allVehiclesOnTrack', 'All vehicles are currently on track')
              }
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>{t('reconHub.alerts.vehicle', 'Vehicle')}</TableHead>
                  <TableHead>{t('reconHub.alerts.step', 'Current Step')}</TableHead>
                  <TableHead>{t('reconHub.alerts.severity', 'Severity')}</TableHead>
                  <TableHead>{t('reconHub.alerts.daysOverdue', 'Days Overdue')}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div 
                        className={`w-4 h-4 rounded-full border-2 ${getColorClass(alert.color)}`}
                        title={`${alert.color.toUpperCase()} alert`}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.vehicleInfo}</div>
                        <div className="text-sm text-muted-foreground">
                          Order: {alert.orderId.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {alert.stepName}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`font-medium ${alert.daysOverdue > 5 ? 'text-destructive' : ''}`}>
                        {alert.daysOverdue} {alert.daysOverdue === 1 ? 'day' : 'days'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Navigate to order detail
                          window.open(`/recon/order/${alert.orderId}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Footer */}
        {filteredAlerts.length > 0 && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div>
                {t('reconHub.alerts.showing', 'Showing {{count}} of {{total}} alerts', {
                  count: filteredAlerts.length,
                  total: alerts.length
                })}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Critical (10+ days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>High (7+ days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Medium (4+ days)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}