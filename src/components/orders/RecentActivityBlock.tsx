import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle,
    Clock,
    Code,
    Edit,
    FileText,
    Heart,
    MessageSquare,
    Paperclip,
    QrCode,
    UserCheck
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ActivityMetadata {
  timeDiff?: number;
  [key: string]: unknown;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface OrderComment {
  id: string;
  order_id: string;
  user_id: string | null;
  comment_text: string;
  comment_type: 'comment' | 'internal';
  created_at: string;
  updated_at: string;
}

interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  uploaded_by: string | null;
  upload_context: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  order_id: string;
  user_id: string | null;
  activity_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
  metadata: ActivityMetadata | null;
}

interface OrderData {
  id: string;
  created_at: string;
  customer_name: string | null;
  status: string;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  user_name: string;
  user_id?: string;
  created_at: string;
  action_type: 'status_change' | 'comment' | 'note' | 'edit' | 'file_upload' | 'qr_regeneration' | 'assignment_change' | 'due_date_change';
  old_value?: string;
  new_value?: string;
  field_name?: string;
  metadata?: ActivityMetadata | OrderComment | OrderAttachment | ActivityLog;
}

interface RecentActivityBlockProps {
  orderId: string;
}

interface DebugInfo {
  commentsCount: number;
  attachmentsCount: number;
  activityLogCount: number;
  orderDataFetched: boolean;
  profilesFetched: number;
  totalActivities: number;
  errors: string[];
}

export function RecentActivityBlock({ orderId }: RecentActivityBlockProps) {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    commentsCount: 0,
    attachmentsCount: 0,
    activityLogCount: 0,
    orderDataFetched: false,
    profilesFetched: 0,
    totalActivities: 0,
    errors: []
  });

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // Translate and format values (status, dates, etc) - from Dashboard
  const translateValue = (value: string | null | undefined, fieldName: string | null): string => {
    if (!value) return 'N/A';

    // If it's a status field, format nicely
    if (fieldName === 'status') {
      // Convert snake_case to Title Case (in_progress → In Progress)
      return value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // If it's a date/timestamp field, format it nicely
    if (fieldName === 'due_date' || value.includes('T') || value.includes('+')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format as: Oct 7, 2:00 PM
          return format(date, 'MMM d, h:mm a', { locale: getLocale() });
        }
      } catch (e) {
        // If parsing fails, continue to return raw value
      }
    }

    // For other fields, return as is
    return value;
  };

  const fetchRecentActivity = useCallback(async () => {
    try {
      setLoading(true);
      const errors: string[] = [];

      console.log(`🔍 [RecentActivity] Fetching activity for order: ${orderId}`);

      // Fetch all activity sources in parallel
      const [commentsResult, attachmentsResult, activityLogResult, orderDataResult] = await Promise.allSettled([
        // 1. Comments and Internal Notes
        supabase
          .from('order_comments')
          .select('id, order_id, user_id, comment_text, comment_type, parent_comment_id, created_at, updated_at')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(10),

        // 2. File Attachments
        supabase
          .from('order_attachments')
          .select('id, order_id, file_name, uploaded_by, upload_context, created_at')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(5),

        // 3. Order Activity Log
        supabase
          .from('order_activity_log')
          .select('id, order_id, user_id, activity_type, field_name, old_value, new_value, description, created_at, metadata')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(20),

        // 4. FALLBACK: Order Data (for "Order Created" activity)
        supabase
          .from('orders')
          .select('id, created_at, customer_name, status')
          .eq('id', orderId)
          .single()
      ]);

      const allActivities: ActivityItem[] = [];

      // Debug tracking
      let commentsCount = 0;
      let attachmentsCount = 0;
      let activityLogCount = 0;
      let orderDataFetched = false;

      // OPTIMIZATION: Collect all user IDs first
      const allUserIds: string[] = [];

      // Process Comments
      if (commentsResult.status === 'fulfilled') {
        if (commentsResult.value.error) {
          console.error('❌ [Comments] RLS Error:', commentsResult.value.error);
          errors.push(`Comments: ${commentsResult.value.error.message}`);
        } else if (commentsResult.value.data) {
          commentsCount = commentsResult.value.data.length;
          console.log(`✅ [Comments] Loaded ${commentsCount} comments`);
          (commentsResult.value.data as OrderComment[]).forEach((comment) => {
            if (comment.user_id) allUserIds.push(comment.user_id);
          });
        }
      } else {
        console.error('❌ [Comments] Promise rejected:', commentsResult.reason);
        errors.push(`Comments: Promise rejected`);
      }

      // Process Attachments
      if (attachmentsResult.status === 'fulfilled') {
        if (attachmentsResult.value.error) {
          console.error('❌ [Attachments] RLS Error:', attachmentsResult.value.error);
          errors.push(`Attachments: ${attachmentsResult.value.error.message}`);
        } else if (attachmentsResult.value.data) {
          attachmentsCount = attachmentsResult.value.data.length;
          console.log(`✅ [Attachments] Loaded ${attachmentsCount} attachments`);
          (attachmentsResult.value.data as OrderAttachment[]).forEach((attachment) => {
            if (attachment.uploaded_by) allUserIds.push(attachment.uploaded_by);
          });
        }
      } else {
        console.error('❌ [Attachments] Promise rejected:', attachmentsResult.reason);
        errors.push(`Attachments: Promise rejected`);
      }

      // Process Activity Log
      if (activityLogResult.status === 'fulfilled') {
        if (activityLogResult.value.error) {
          console.error('❌ [ActivityLog] RLS Error:', activityLogResult.value.error);
          errors.push(`Activity Log: ${activityLogResult.value.error.message}`);
        } else if (activityLogResult.value.data) {
          activityLogCount = activityLogResult.value.data.length;
          console.log(`✅ [ActivityLog] Loaded ${activityLogCount} log entries`);
          (activityLogResult.value.data as ActivityLog[]).forEach((log) => {
            if (log.user_id) allUserIds.push(log.user_id);
          });
        }
      } else {
        console.error('❌ [ActivityLog] Promise rejected:', activityLogResult.reason);
        errors.push(`Activity Log: Promise rejected`);
      }

      // Process Order Data (Fallback)
      if (orderDataResult.status === 'fulfilled') {
        if (orderDataResult.value.error) {
          console.error('❌ [OrderData] Error:', orderDataResult.value.error);
          errors.push(`Order Data: ${orderDataResult.value.error.message}`);
        } else if (orderDataResult.value.data) {
          orderDataFetched = true;
          const orderData = orderDataResult.value.data as OrderData;
          // Note: orders table doesn't have created_by field
          console.log(`✅ [OrderData] Loaded order created_at: ${orderData.created_at}`);
        }
      } else {
        console.error('❌ [OrderData] Promise rejected:', orderDataResult.reason);
        errors.push(`Order Data: Promise rejected`);
      }

      // Fetch all user profiles in ONE query
      const uniqueUserIds = [...new Set(allUserIds)];
      let userProfiles: Record<string, UserProfile> = {};
      let profilesFetched = 0;

      if (uniqueUserIds.length > 0) {
        try {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', uniqueUserIds);

          if (profileError) {
            console.error('❌ [Profiles] Error:', profileError);
            errors.push(`Profiles: ${profileError.message}`);
          } else if (profiles) {
            profilesFetched = profiles.length;
            userProfiles = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, UserProfile>);
            console.log(`✅ [Profiles] Loaded ${profilesFetched} user profiles`);
          }
        } catch (profileError) {
          console.warn('⚠️  [Profiles] Failed to fetch:', profileError);
          errors.push(`Profiles: Failed to fetch`);
        }
      }

      // Helper function to get user name
      const getUserName = (userId: string | null | undefined): string => {
        if (!userId) return t('recent_activity.user.system');
        const profile = userProfiles[userId];
        if (!profile) return t('recent_activity.user.team_member');

        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        return fullName || profile.email || t('recent_activity.user.team_member');
      };

      // Process Comments
      if (commentsResult.status === 'fulfilled' && commentsResult.value.data) {
        const comments = commentsResult.value.data as OrderComment[];
        const commentActivities = comments.map((comment) => {
          // Determine if this is a reply
          const isReply = !!comment.parent_comment_id;

          // Choose appropriate action text
          let action: string;
          if (comment.comment_type === 'internal') {
            action = isReply
              ? t('recent_activity.actions.replied_to_internal_note')
              : t('recent_activity.actions.added_internal_note');
          } else {
            action = isReply
              ? t('recent_activity.actions.replied_to_comment')
              : t('recent_activity.actions.added_comment');
          }

          return {
            id: `comment-${comment.id}`,
            action,
            description: (comment.comment_text || '').substring(0, 80) + (((comment.comment_text || '').length > 80) ? '...' : ''),
            user_name: getUserName(comment.user_id),
            user_id: comment.user_id || undefined,
            created_at: comment.created_at,
            action_type: (comment.comment_type === 'internal' ? 'note' : 'comment') as ActivityItem['action_type'],
            metadata: { ...comment, isReply }
          };
        });
        allActivities.push(...commentActivities);
      }

      // Process File Attachments
      if (attachmentsResult.status === 'fulfilled' && attachmentsResult.value.data) {
        const attachments = attachmentsResult.value.data as OrderAttachment[];
        const fileActivities = attachments.map((attachment) => ({
          id: `file-${attachment.id}`,
          action: t('recent_activity.actions.uploaded_file'),
          description: t('recent_activity.files.attached', { filename: attachment.file_name }),
          user_name: getUserName(attachment.uploaded_by),
          user_id: attachment.uploaded_by || undefined,
          created_at: attachment.created_at,
          action_type: 'file_upload' as const,
          new_value: attachment.file_name,
          metadata: attachment
        }));
        allActivities.push(...fileActivities);
      }

      // Process Activity Log
      if (activityLogResult.status === 'fulfilled' && activityLogResult.value.data) {
        const activityLogs = activityLogResult.value.data as ActivityLog[];
        const activityLogItems = activityLogs.map((log) => {
          const activityTypeMap: Record<string, ActivityItem['action_type']> = {
            'status_changed': 'status_change',
            'assignment_changed': 'assignment_change',
            'due_date_changed': 'due_date_change',
            'notes_updated': 'note',
            'order_created': 'edit',
            'priority_changed': 'edit',
            'customer_updated': 'edit',
            'services_updated': 'edit',
            'amount_updated': 'edit'
          };

          const actionType = activityTypeMap[log.activity_type] || 'edit';
          let action = log.description || log.activity_type.replace(/_/g, ' ');

          // Format values in action text (e.g., "from in_progress to pending" → "from In Progress to Pending")
          if (log.old_value && log.new_value && log.field_name) {
            const formattedOld = translateValue(log.old_value, log.field_name);
            const formattedNew = translateValue(log.new_value, log.field_name);

            // Replace raw values in description with formatted ones
            action = action
              .replace(log.old_value, formattedOld)
              .replace(log.new_value, formattedNew);
          }

          return {
            id: `activity-log-${log.id}`,
            action: action.charAt(0).toUpperCase() + action.slice(1),
            description: log.field_name
              ? `Changed ${log.field_name.replace(/_/g, ' ')}`
              : log.description || '',
            user_name: getUserName(log.user_id),
            user_id: log.user_id || undefined,
            created_at: log.created_at,
            action_type: actionType,
            old_value: log.old_value || undefined,
            new_value: log.new_value || undefined,
            field_name: log.field_name || undefined,
            metadata: log.metadata || undefined
          };
        });

        allActivities.push(...activityLogItems);
      }

      // FALLBACK: If NO activities from any source, create "Order Created" from order data
      if (allActivities.length === 0 && orderDataResult.status === 'fulfilled' && orderDataResult.value.data) {
        const orderData = orderDataResult.value.data as OrderData;
        console.log('📌 [Fallback] Creating synthetic "Order Created" activity');

        allActivities.push({
          id: `order-created-${orderData.id}`,
          action: t('recent_activity.actions.order_created'),
          description: t('recent_activity.actions.initial_creation'),
          user_name: t('recent_activity.user.system'), // orders table doesn't have created_by
          created_at: orderData.created_at,
          action_type: 'edit',
          metadata: { fallback: true, customer_name: orderData.customer_name }
        });
      }

      // Sort all activities by date (most recent first) and limit
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setActivities(sortedActivities);
      setDebugInfo({
        commentsCount,
        attachmentsCount,
        activityLogCount,
        orderDataFetched,
        profilesFetched,
        totalActivities: sortedActivities.length,
        errors
      });
      setError(null);
      console.log(`📊 [RecentActivity] Total activities loaded: ${sortedActivities.length}`);
    } catch (error) {
      console.error('💥 [RecentActivity] Critical error:', error);
      setError('Failed to load activity. Please try again.');
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, 'Critical error in fetch'] }));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    fetchRecentActivity();

    // REAL-TIME: Subscribe to Supabase changes
    console.log(`🔔 [RealtimeSubscription] Setting up for order: ${orderId}`);

    let channel: RealtimeChannel | null = null;

    try {
      channel = supabase
        .channel(`order-activity-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_activity_log',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            console.log('🔔 [Realtime] Activity log changed:', payload);
            fetchRecentActivity();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_comments',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            console.log('🔔 [Realtime] Comment changed:', payload);
            fetchRecentActivity();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_attachments',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            console.log('🔔 [Realtime] Attachment changed:', payload);
            fetchRecentActivity();
          }
        )
        .subscribe((status) => {
          console.log(`🔔 [Realtime] Subscription status: ${status}`);
        });
    } catch (realtimeError) {
      console.error('⚠️  [Realtime] Failed to subscribe:', realtimeError);
    }

    // Legacy window event listeners (keep for backward compatibility)
    const handleActivityUpdate = () => {
      console.log('📢 [WindowEvent] Activity update triggered');
      fetchRecentActivity();
    };

    window.addEventListener('orderStatusUpdated', handleActivityUpdate);
    window.addEventListener('orderCommentAdded', handleActivityUpdate);
    window.addEventListener('orderCommentDeleted', handleActivityUpdate);
    window.addEventListener('orderAttachmentAdded', handleActivityUpdate);
    window.addEventListener('orderNotesUpdated', handleActivityUpdate);
    window.addEventListener('reactionAdded', handleActivityUpdate);

    return () => {
      console.log('🧹 [Cleanup] Unsubscribing from realtime and window events');
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('orderStatusUpdated', handleActivityUpdate);
      window.removeEventListener('orderCommentAdded', handleActivityUpdate);
      window.removeEventListener('orderCommentDeleted', handleActivityUpdate);
      window.removeEventListener('orderAttachmentAdded', handleActivityUpdate);
      window.removeEventListener('orderNotesUpdated', handleActivityUpdate);
      window.removeEventListener('reactionAdded', handleActivityUpdate);
    };
  }, [orderId, fetchRecentActivity]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-gray-700" />;
      case 'note':
      case 'internal_note':
        return <FileText className="h-4 w-4 text-amber-500" />;
      case 'reaction':
        return <Heart className="h-4 w-4 text-pink-500" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-gray-600" />;
      case 'file_upload':
        return <Paperclip className="h-4 w-4 text-gray-600" />;
      case 'qr_regeneration':
        return <QrCode className="h-4 w-4 text-indigo-500" />;
      case 'assignment_change':
        return <UserCheck className="h-4 w-4 text-gray-600" />;
      case 'due_date_change':
        return <Calendar className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'border-l-emerald-500 bg-emerald-50/30';
      case 'comment':
        return 'border-l-indigo-500 bg-indigo-50/30';
      case 'note':
      case 'internal_note':
        return 'border-l-amber-500 bg-amber-50/30';
      case 'reaction':
        return 'border-l-pink-500 bg-pink-50/30';
      case 'edit':
        return 'border-l-gray-400 bg-gray-50/30';
      case 'file_upload':
        return 'border-l-gray-400 bg-gray-50/30';
      case 'qr_regeneration':
        return 'border-l-indigo-500 bg-indigo-50/30';
      case 'assignment_change':
        return 'border-l-gray-400 bg-gray-50/30';
      case 'due_date_change':
        return 'border-l-gray-400 bg-gray-50/30';
      default:
        return 'border-l-gray-400 bg-gray-50/30';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('recent_activity.time.just_now');
    if (diffInMinutes < 60) return t('recent_activity.time.minutes_ago', { count: diffInMinutes });
    if (diffInMinutes < 1440) return t('recent_activity.time.hours_ago', { count: Math.floor(diffInMinutes / 60) });
    return t('recent_activity.time.days_ago', { count: Math.floor(diffInMinutes / 1440) });
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3 bg-gradient-to-br from-background to-muted/20">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold">{t('recent_activity.title')}</span>
          {activities.length > 0 && (
            <Badge variant="secondary" className="text-xs font-bold px-1.5 py-0.5">
              {activities.length}
            </Badge>
          )}
          {debugInfo.errors.length > 0 && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Code className="h-3 w-3" />
              {showDebug ? t('recent_activity.hide_debug') : t('recent_activity.show_debug')}
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-3">
        {/* Debug Information */}
        {showDebug && (
          <div className="bg-gray-100 p-3 rounded text-xs space-y-1 font-mono">
            <div className="font-bold text-gray-700">{t('recent_activity.debug_mode')}</div>
            <div>📊 {t('recent_activity.sources.comments')}: {debugInfo.commentsCount}</div>
            <div>📎 {t('recent_activity.sources.attachments')}: {debugInfo.attachmentsCount}</div>
            <div>📝 {t('recent_activity.sources.activity_log')}: {debugInfo.activityLogCount}</div>
            <div>🗂️ {t('recent_activity.sources.order_data')}: {debugInfo.orderDataFetched ? '✅' : '❌'}</div>
            <div>👥 Profiles: {debugInfo.profilesFetched}</div>
            <div>✅ Total Activities: {debugInfo.totalActivities}</div>
            {debugInfo.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="font-bold text-red-600">Errors:</div>
                {debugInfo.errors.map((err, idx) => (
                  <div key={idx} className="text-red-600">❌ {err}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 px-3 rounded-xl bg-muted/40 border border-border/50">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-medium text-foreground">{t('recent_activity.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 px-4 rounded-xl bg-red-50 border-2 border-red-200">
            <div className="p-3 rounded-lg bg-red-100 inline-block mb-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm font-bold text-red-900 mb-3">{t('recent_activity.error_loading')}</p>
            <button
              onClick={() => fetchRecentActivity()}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              {t('recent_activity.retry')}
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 px-3 rounded-lg bg-muted/40 border border-dashed border-border">
            <div className="p-2 rounded-lg bg-muted/60 inline-block mb-2">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-foreground">{t('recent_activity.no_activity')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('recent_activity.no_activity_description')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-2.5 rounded-lg border-l-3 shadow-sm hover:shadow transition-shadow ${getActivityColor(activity.action_type)}`}
              >
                <div className="flex items-start gap-2">
                  {/* Icon with circle background - Compact */}
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-background to-muted/40 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-border/50">
                    {getActivityIcon(activity.action_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{activity.action}</span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-[11px]">{getTimeAgo(activity.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      {activity.description}
                    </p>

                    {/* Show old/new values if available - Compact */}
                    {(activity.old_value || activity.new_value) && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {activity.old_value && activity.new_value ? (
                          <>
                            <Badge variant="outline" className="text-[10px] font-medium bg-red-50 text-red-700 border-red-300 px-1.5 py-0">
                              {translateValue(activity.old_value, activity.field_name || null)}
                            </Badge>
                            <ArrowRight className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-300 px-1.5 py-0">
                              {translateValue(activity.new_value, activity.field_name || null)}
                            </Badge>
                          </>
                        ) : activity.new_value ? (
                          <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-300 px-1.5 py-0">
                            {translateValue(activity.new_value, activity.field_name || null)}
                          </Badge>
                        ) : null}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5 ring-1 ring-primary/10">
                        <AvatarFallback className="text-[10px] font-bold">
                          {activity.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground">
                        {t('recent_activity.user.by', { name: activity.user_name })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Summary */}
        {activities.length > 0 && (
          <div className="pt-2 border-t border-border/60 text-center">
            <p className="text-[10px] text-muted-foreground">
              {t('recent_activity.last_activity')}: {activities[0] ? getTimeAgo(activities[0].created_at) : t('recent_activity.none')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
