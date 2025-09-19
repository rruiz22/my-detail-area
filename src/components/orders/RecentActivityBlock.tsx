import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity,
  Clock,
  Edit,
  MessageSquare,
  FileText,
  User,
  CheckCircle,
  AlertTriangle,
  Paperclip,
  QrCode,
  UserCheck,
  Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

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
  metadata?: any;
}

interface RecentActivityBlockProps {
  orderId: string;
}

export function RecentActivityBlock({ orderId }: RecentActivityBlockProps) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentActivity = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all activity sources in parallel
      const [commentsResult, attachmentsResult, orderHistoryResult] = await Promise.allSettled([
        // 1. Comments and Internal Notes (without JOIN - we'll fetch user info separately)
        supabase
          .from('order_comments')
          .select(`
            id,
            order_id,
            user_id,
            comment_text,
            comment_type,
            created_at,
            updated_at
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(10),

        // 2. File Attachments (without JOIN - we'll fetch user info separately)
        supabase
          .from('order_attachments')
          .select(`
            id,
            order_id,
            file_name,
            uploaded_by,
            upload_context,
            created_at
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(5),

        // 3. Order Updates (by checking updated_at vs created_at)
        supabase
          .from('orders')
          .select('id, created_at, updated_at, status, assigned_group_id')
          .eq('id', orderId)
          .single()
      ]);

      const allActivities: ActivityItem[] = [];

      // Process Comments
      if (commentsResult.status === 'fulfilled' && commentsResult.value.data) {
        const comments = commentsResult.value.data;
        const commentActivities = comments.map((comment: any) => {
          // Use a generic user name since we're not fetching profile info
          const userName = 'Team Member';

          return {
            id: `comment-${comment.id}`,
            action: comment.comment_type === 'internal' ? 'Added internal note' : 'Added comment',
            description: (comment.comment_text || '').substring(0, 80) + (((comment.comment_text || '').length > 80) ? '...' : ''),
            user_name: userName,
            user_id: comment.user_id,
            created_at: comment.created_at,
            action_type: comment.comment_type === 'internal' ? 'note' : 'comment',
            metadata: comment
          };
        });
        allActivities.push(...commentActivities);
      }

      // Process File Attachments
      if (attachmentsResult.status === 'fulfilled' && attachmentsResult.value.data) {
        const attachments = attachmentsResult.value.data;
        const fileActivities = attachments.map((attachment: any) => {
          // Use a generic user name since we're not fetching profile info
          const userName = 'Team Member';

          return {
            id: `file-${attachment.id}`,
            action: 'Uploaded file',
            description: `Attached: ${attachment.file_name}`,
            user_name: userName,
            user_id: attachment.uploaded_by,
            created_at: attachment.created_at,
            action_type: 'file_upload' as const,
            new_value: attachment.file_name,
            metadata: attachment
          };
        });
        allActivities.push(...fileActivities);
      }

      // Process Order Updates (detect if order was edited)
      if (orderHistoryResult.status === 'fulfilled' && orderHistoryResult.value.data) {
        const order = orderHistoryResult.value.data;

        // If updated_at is significantly different from created_at, it was edited
        const createdTime = new Date(order.created_at).getTime();
        const updatedTime = new Date(order.updated_at).getTime();
        const timeDiff = updatedTime - createdTime;

        if (timeDiff > 60000) { // More than 1 minute difference
          allActivities.push({
            id: `order-update-${order.id}`,
            action: 'Order updated',
            description: 'Order information was modified',
            user_name: 'System', // Could be enhanced to track who made the change
            created_at: order.updated_at,
            action_type: 'edit',
            metadata: { timeDiff: Math.floor(timeDiff / 1000) }
          });
        }
      }

      // Sort all activities by date (most recent first) and limit
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10); // Increased limit to 10

      setActivities(sortedActivities);
      console.log('📊 Recent activities loaded:', sortedActivities.length);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchRecentActivity();

    // Listen for real-time activity updates
    const handleActivityUpdate = () => {
      fetchRecentActivity();
    };

    window.addEventListener('orderStatusUpdated', handleActivityUpdate);
    window.addEventListener('orderCommentAdded', handleActivityUpdate);

    return () => {
      window.removeEventListener('orderStatusUpdated', handleActivityUpdate);
      window.removeEventListener('orderCommentAdded', handleActivityUpdate);
    };
  }, [orderId, fetchRecentActivity]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-gray-700" />;
      case 'note':
        return <FileText className="h-4 w-4 text-amber-600" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-purple-600" />;
      case 'file_upload':
        return <Paperclip className="h-4 w-4 text-orange-600" />;
      case 'qr_regeneration':
        return <QrCode className="h-4 w-4 text-indigo-600" />;
      case 'assignment_change':
        return <UserCheck className="h-4 w-4 text-teal-600" />;
      case 'due_date_change':
        return <Calendar className="h-4 w-4 text-pink-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'border-l-green-500 bg-green-50/30';
      case 'comment':
        return 'border-l-indigo-500 bg-indigo-50/30';
      case 'note':
        return 'border-l-amber-500 bg-amber-50/30';
      case 'edit':
        return 'border-l-purple-500 bg-purple-50/30';
      case 'file_upload':
        return 'border-l-orange-500 bg-orange-50/30';
      case 'qr_regeneration':
        return 'border-l-indigo-500 bg-indigo-50/30';
      case 'assignment_change':
        return 'border-l-teal-500 bg-teal-50/30';
      case 'due_date_change':
        return 'border-l-pink-500 bg-pink-50/30';
      default:
        return 'border-l-gray-500 bg-gray-50/30';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-700" />
          Recent Activity
          {activities.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-gray-700 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`p-3 rounded-lg border-l-2 ${getActivityColor(activity.action_type)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.action_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{activity.action}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(activity.created_at)}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {activity.description}
                    </p>

                    {/* Show old/new values if available */}
                    {(activity.old_value || activity.new_value) && (
                      <div className="text-xs bg-background/50 p-2 rounded mb-2">
                        {activity.old_value && activity.new_value ? (
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 line-through">{activity.old_value}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 font-medium">{activity.new_value}</span>
                          </div>
                        ) : activity.new_value ? (
                          <span className="text-green-600 font-medium">{activity.new_value}</span>
                        ) : null}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-xs">
                          {activity.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        by {activity.user_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Activity Summary */}
        <div className="pt-2 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Last activity: {activities[0] ? getTimeAgo(activities[0].created_at) : 'None'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}