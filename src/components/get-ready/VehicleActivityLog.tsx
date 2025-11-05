import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useVehicleActivityLog } from '@/hooks/useVehicleActivityLog';
import type { VehicleActivity } from '@/hooks/useVehicleActivityLog';
import { cn } from '@/lib/utils';
import {
  formatRelativeTime,
  formatUserName,
  groupActivitiesByDate,
} from '@/utils/activityFormatters';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  FileText,
  Image,
  MessageCircle,
  Pen,
  Plus,
  Trash,
  User,
  UserMinus,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleActivityLogProps {
  vehicleId: string;
  className?: string;
}

export function VehicleActivityLog({
  vehicleId,
  className,
}: VehicleActivityLogProps) {
  const { t, i18n } = useTranslation();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVehicleActivityLog(vehicleId);

  // Flatten all pages of activities
  const activities = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.activities) || [];
  }, [data]);

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    return groupActivitiesByDate(activities, t);
  }, [activities, t]);

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('get_ready.activity_log.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('get_ready.activity_log.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{t('get_ready.activity_log.error_loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('get_ready.activity_log.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('get_ready.activity_log.no_activity')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group) => (
                <div key={group.date}>
                  <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {group.label}
                  </div>
                  <div className="space-y-0">
                    {group.activities.map((activity, index) => (
                      <div key={activity.id}>
                        <ActivityItem activity={activity} language={i18n.language} />
                        {index < group.activities.length - 1 && (
                          <Separator className="ml-10 my-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage
                      ? t('get_ready.activity_log.loading')
                      : t('get_ready.activity_log.load_more')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  activity: VehicleActivity;
  language: string;
}

function ActivityItem({ activity, language }: ActivityItemProps) {
  const { t } = useTranslation();
  const icon = getActivityIcon(activity.activity_type);
  const color = getActivityColor(activity.activity_type);
  const timestamp = formatRelativeTime(activity.created_at, language);
  const userName = formatUserName(activity, t);

  // Extract metadata for enhanced display
  const metadata = activity.metadata as Record<string, any> | null;
  const noteContent = metadata?.content_preview;
  const noteType = metadata?.note_type;
  const workItemTitle = metadata?.work_item_title;
  const fileName = metadata?.file_name;
  const vendorName = metadata?.old_vendor_name || metadata?.new_vendor_name;

  return (
    <div className={cn('flex gap-3 py-3 border-l-2 pl-4', color)}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {activity.description ||
                t(`get_ready.activity_log.types.${activity.activity_type}`)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{userName}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>

            {/* Show note content preview */}
            {noteContent && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground italic border-l-2 border-blue-300">
                "{noteContent.length > 100 ? noteContent.substring(0, 100) + '...' : noteContent}"
              </div>
            )}

            {/* Show work item context */}
            {workItemTitle && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Work Item:</span> {workItemTitle}
              </div>
            )}

            {/* Show file name for media */}
            {fileName && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">File:</span> {fileName}
              </div>
            )}

            {/* Show vendor name */}
            {vendorName && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Vendor:</span> {vendorName}
              </div>
            )}

            {/* Show old → new for changes */}
            {activity.old_value && activity.new_value && (
              <div className="flex items-center gap-2 text-xs mt-2">
                <Badge variant="outline" className="font-mono bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">
                  {activity.old_value.length > 50 ? activity.old_value.substring(0, 50) + '...' : activity.old_value}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="font-mono bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
                  {activity.new_value.length > 50 ? activity.new_value.substring(0, 50) + '...' : activity.new_value}
                </Badge>
              </div>
            )}

            {/* Show field name if available */}
            {activity.field_name && (
              <div className="mt-1">
                <Badge variant="secondary" className="text-xs">
                  {activity.field_name.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {t(`get_ready.activity_log.badge_types.${activity.activity_type}`)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  const iconMap: Record<string, React.ReactNode> = {
    vehicle_created: <Plus className="h-4 w-4 text-green-500" />,
    vehicle_updated: <Edit className="h-4 w-4 text-blue-500" />,
    vehicle_deleted: <Trash className="h-4 w-4 text-red-500" />,
    vehicle_completed: <CheckSquare className="h-4 w-4 text-green-600" />,
    step_changed: <ArrowRight className="h-4 w-4 text-purple-500" />,
    priority_changed: <Edit className="h-4 w-4 text-amber-500" />,
    workflow_changed: <Edit className="h-4 w-4 text-cyan-500" />,
    work_item_created: <Plus className="h-4 w-4 text-green-500" />,
    work_item_updated: <Edit className="h-4 w-4 text-blue-500" />,
    work_item_approved: <CheckCircle className="h-4 w-4 text-green-600" />,
    work_item_declined: <XCircle className="h-4 w-4 text-red-600" />,
    work_item_completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    work_item_deleted: <Trash className="h-4 w-4 text-red-500" />,
    note_added: <FileText className="h-4 w-4 text-blue-500" />,
    note_updated: <Edit className="h-4 w-4 text-blue-500" />,
    note_deleted: <Trash className="h-4 w-4 text-red-500" />,
    note_reply_added: <MessageCircle className="h-4 w-4 text-cyan-500" />,
    note_reply_deleted: <Trash className="h-4 w-4 text-red-500" />,
    media_uploaded: <Image className="h-4 w-4 text-purple-500" />,
    media_annotated: <Pen className="h-4 w-4 text-pink-500" />,
    media_updated: <Edit className="h-4 w-4 text-purple-500" />,
    media_deleted: <Trash className="h-4 w-4 text-red-500" />,
    vendor_assigned: <User className="h-4 w-4 text-indigo-500" />,
    vendor_removed: <UserMinus className="h-4 w-4 text-gray-500" />,
    approval_requested: <AlertCircle className="h-4 w-4 text-amber-500" />,
    approval_granted: <CheckCircle className="h-4 w-4 text-green-600" />,
    approval_rejected: <XCircle className="h-4 w-4 text-red-600" />,
    sla_warning: <Clock className="h-4 w-4 text-amber-500" />,
    sla_critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
    stock_updated: <Edit className="h-4 w-4 text-slate-500" />,
    assignment_changed: <User className="h-4 w-4 text-indigo-500" />,
  };

  return iconMap[type] || <Edit className="h-4 w-4 text-muted-foreground" />;
}

function getActivityColor(type: string): string {
  const colorMap: Record<string, string> = {
    vehicle_created: 'border-l-green-500',
    vehicle_updated: 'border-l-blue-500',
    vehicle_deleted: 'border-l-red-500',
    vehicle_completed: 'border-l-green-600',
    step_changed: 'border-l-purple-500',
    priority_changed: 'border-l-amber-500',
    workflow_changed: 'border-l-cyan-500',
    work_item_created: 'border-l-green-500',
    work_item_updated: 'border-l-blue-500',
    work_item_approved: 'border-l-green-600',
    work_item_declined: 'border-l-red-600',
    work_item_completed: 'border-l-green-600',
    work_item_deleted: 'border-l-red-500',
    note_added: 'border-l-blue-500',
    note_updated: 'border-l-blue-500',
    note_deleted: 'border-l-red-500',
    note_reply_added: 'border-l-cyan-500',
    note_reply_deleted: 'border-l-red-500',
    media_uploaded: 'border-l-purple-500',
    media_annotated: 'border-l-pink-500',
    media_updated: 'border-l-purple-500',
    media_deleted: 'border-l-red-500',
    vendor_assigned: 'border-l-indigo-500',
    vendor_removed: 'border-l-gray-500',
    approval_requested: 'border-l-amber-500',
    approval_granted: 'border-l-green-600',
    approval_rejected: 'border-l-red-600',
    sla_warning: 'border-l-amber-500',
    sla_critical: 'border-l-red-600',
    stock_updated: 'border-l-slate-500',
    assignment_changed: 'border-l-indigo-500',
  };

  return colorMap[type] || 'border-l-muted-foreground';
}
