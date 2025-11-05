import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGetReadyActivity } from '@/hooks/useGetReadyActivity';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Info,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  XCircle,
  Wrench,
  Car,
  ArrowRight,
  AlertCircle,
  CheckCheck,
  Ban
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityType } from '@/types/getReadyActivity';
import { cn } from '@/lib/utils';

// Activity type groups for organized filtering
const ACTIVITY_TYPE_GROUPS = {
  vehicle: ['vehicle_created', 'vehicle_updated', 'vehicle_deleted', 'step_changed', 'priority_changed', 'workflow_changed', 'vehicle_completed'] as ActivityType[],
  workItem: ['work_item_created', 'work_item_updated', 'work_item_completed', 'work_item_approved', 'work_item_declined', 'work_item_deleted'] as ActivityType[],
  approval: ['approval_requested', 'approval_granted', 'approval_rejected'] as ActivityType[],
  vendor: ['vendor_assigned', 'vendor_removed'] as ActivityType[],
  other: ['note_added', 'note_updated', 'note_deleted', 'media_uploaded', 'media_deleted', 'sla_warning', 'sla_critical'] as ActivityType[]
};

export function GetReadyActivityFeed() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('7days');

  const filters = useMemo(() => ({
    activityTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    searchQuery: searchQuery.trim() || undefined,
    dateFrom: dateFilter === 'today'
      ? new Date(new Date().setHours(0,0,0,0))
      : dateFilter === '7days'
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : dateFilter === '30days'
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : undefined
  }), [searchQuery, selectedTypes, dateFilter]);

  const {
    activities,
    stats,
    isLoading,
    statsLoading,
    error,
    isConnected,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGetReadyActivity(filters);

  // Activity type icon mapping
  const getActivityIcon = (type: ActivityType) => {
    const iconMap: Record<ActivityType, React.ReactNode> = {
      vehicle_created: <PlusCircle className="h-4 w-4" />,
      vehicle_updated: <FileText className="h-4 w-4" />,
      vehicle_deleted: <Trash2 className="h-4 w-4" />,
      step_changed: <ArrowRight className="h-4 w-4" />,
      priority_changed: <TrendingUp className="h-4 w-4" />,
      workflow_changed: <Activity className="h-4 w-4" />,
      work_item_created: <Wrench className="h-4 w-4" />,
      work_item_updated: <FileText className="h-4 w-4" />,
      work_item_completed: <CheckCircle2 className="h-4 w-4" />,
      work_item_approved: <CheckCheck className="h-4 w-4" />,
      work_item_declined: <XCircle className="h-4 w-4" />,
      work_item_deleted: <Trash2 className="h-4 w-4" />,
      note_added: <FileText className="h-4 w-4" />,
      note_updated: <FileText className="h-4 w-4" />,
      note_deleted: <Trash2 className="h-4 w-4" />,
      media_uploaded: <Upload className="h-4 w-4" />,
      media_deleted: <Trash2 className="h-4 w-4" />,
      vendor_assigned: <Users className="h-4 w-4" />,
      vendor_removed: <Users className="h-4 w-4" />,
      approval_requested: <Clock className="h-4 w-4" />,
      approval_granted: <CheckCircle2 className="h-4 w-4" />,
      approval_rejected: <Ban className="h-4 w-4" />,
      sla_warning: <AlertTriangle className="h-4 w-4" />,
      sla_critical: <AlertCircle className="h-4 w-4" />,
      vehicle_completed: <CheckCheck className="h-4 w-4" />
    };
    return iconMap[type] || <Activity className="h-4 w-4" />;
  };

  // Activity type color mapping
  const getActivityColor = (type: ActivityType): string => {
    if (type.includes('created') || type.includes('approved') || type.includes('granted') || type.includes('completed')) {
      return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800';
    }
    if (type.includes('deleted') || type.includes('declined') || type.includes('rejected')) {
      return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800';
    }
    if (type.includes('warning') || type.includes('critical')) {
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    }
    if (type.includes('updated') || type.includes('changed')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-400 border-gray-200 dark:border-gray-800';
  };

  const formatActivityType = (type: ActivityType | null | undefined): string => {
    if (!type) return 'N/A';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const toggleActivityType = (type: ActivityType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleActivityGroup = (group: ActivityType[]) => {
    const allSelected = group.every(type => selectedTypes.includes(type));
    if (allSelected) {
      setSelectedTypes(prev => prev.filter(t => !group.includes(t)));
    } else {
      setSelectedTypes(prev => [...new Set([...prev, ...group])]);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Activity</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('get_ready.activity.title') || 'Recent Activity'}
          </h2>
          <p className="text-muted-foreground">
            {t('get_ready.activity.subtitle') || 'Complete audit trail of all vehicle changes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {!statsLoading && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_activities}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activities_today}</div>
              <p className="text-xs text-muted-foreground">Activities today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Top Activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">{formatActivityType(stats.top_activity_type)}</div>
              <p className="text-xs text-muted-foreground">Most common</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recent Trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activity_trend?.[stats.activity_trend.length - 1]?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Yesterday's count</p>
            </CardContent>
          </Card>
        </div>
      )}

      {statsLoading && (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <Filter className="h-4 w-4 mr-2" />
                  Type
                  {selectedTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                <DropdownMenuLabel>Activity Types</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Vehicle Activities */}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs w-full justify-start"
                    onClick={() => toggleActivityGroup(ACTIVITY_TYPE_GROUPS.vehicle)}
                  >
                    <Car className="h-3 w-3 mr-1" />
                    Vehicle Activities
                  </Button>
                </DropdownMenuLabel>
                {ACTIVITY_TYPE_GROUPS.vehicle.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                    className="pl-6"
                  >
                    {formatActivityType(type)}
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                {/* Work Item Activities */}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs w-full justify-start"
                    onClick={() => toggleActivityGroup(ACTIVITY_TYPE_GROUPS.workItem)}
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    Work Items
                  </Button>
                </DropdownMenuLabel>
                {ACTIVITY_TYPE_GROUPS.workItem.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                    className="pl-6"
                  >
                    {formatActivityType(type)}
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                {/* Approval Activities */}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs w-full justify-start"
                    onClick={() => toggleActivityGroup(ACTIVITY_TYPE_GROUPS.approval)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approvals
                  </Button>
                </DropdownMenuLabel>
                {ACTIVITY_TYPE_GROUPS.approval.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                    className="pl-6"
                  >
                    {formatActivityType(type)}
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                {/* Other Activities */}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs w-full justify-start"
                    onClick={() => toggleActivityGroup(ACTIVITY_TYPE_GROUPS.other)}
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Other
                  </Button>
                </DropdownMenuLabel>
                {ACTIVITY_TYPE_GROUPS.other.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => toggleActivityType(type)}
                    className="pl-6"
                  >
                    {formatActivityType(type)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedTypes.length > 0 || searchQuery || dateFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTypes([]);
                  setDateFilter('all');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activities Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedTypes.length > 0 || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as changes are made'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border",
                    getActivityColor(activity.activity_type)
                  )}>
                    {getActivityIcon(activity.activity_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                          {activity.profiles && (
                            <>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{activity.profiles.first_name} {activity.profiles.last_name}</span>
                              </div>
                              <span>•</span>
                            </>
                          )}
                          {activity.get_ready_vehicles && (
                            <>
                              <div className="flex items-center gap-1">
                                <Car className="h-3 w-3" />
                                <span>
                                  {activity.get_ready_vehicles.vehicle_year} {activity.get_ready_vehicles.vehicle_make} {activity.get_ready_vehicles.vehicle_model}
                                </span>
                              </div>
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {activity.get_ready_vehicles.stock_number}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {formatActivityType(activity.activity_type)}
                      </Badge>
                    </div>

                    {/* Note Content Preview */}
                    {activity.metadata?.content_preview && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-900 dark:text-blue-300 italic border-l-2 border-blue-400">
                        "{activity.metadata.content_preview.length > 150 ?
                          activity.metadata.content_preview.substring(0, 150) + '...' :
                          activity.metadata.content_preview}"
                      </div>
                    )}

                    {/* Work Item Context */}
                    {activity.metadata?.work_item_title && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <Wrench className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Work Item:</span>
                        <span className="font-medium">{activity.metadata.work_item_title}</span>
                      </div>
                    )}

                    {/* File Name (Media) */}
                    {activity.metadata?.file_name && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">File:</span>
                        <span className="font-medium font-mono">{activity.metadata.file_name}</span>
                        {activity.metadata.file_size && (
                          <span className="text-muted-foreground">
                            ({(activity.metadata.file_size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Vendor Information */}
                    {(activity.metadata?.old_vendor_name || activity.metadata?.new_vendor_name) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Vendor:</span>
                        {activity.metadata.is_reassignment ? (
                          <>
                            <span className="line-through text-red-600 dark:text-red-400">
                              {activity.metadata.old_vendor_name}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {activity.metadata.new_vendor_name}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            {activity.metadata.old_vendor_name || activity.metadata.new_vendor_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Change Details (Field Changes) */}
                    {activity.field_name && activity.old_value && activity.new_value && (
                      <div className="mt-2 text-xs bg-muted/50 rounded p-2 flex items-center gap-1 flex-wrap">
                        <span className="text-muted-foreground font-medium">
                          {activity.field_name.replace(/_/g, ' ')}:
                        </span>
                        <span className="line-through text-red-600 dark:text-red-400">
                          {activity.old_value.length > 50 ? activity.old_value.substring(0, 50) + '...' : activity.old_value}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {activity.new_value.length > 50 ? activity.new_value.substring(0, 50) + '...' : activity.new_value}
                        </span>
                      </div>
                    )}

                    {/* Expandable Full Metadata (for debugging/details) */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:underline flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          View technical details
                        </summary>
                        <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-auto max-h-32 font-mono">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasNextPage && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
