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
  Paperclip
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
  action_type: 'status_change' | 'comment' | 'note' | 'edit' | 'file_upload';
  metadata?: any;
}

interface RecentActivityBlockProps {
  orderId: string;
}

export function RecentActivityBlock({ orderId }: RecentActivityBlockProps) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchRecentActivity = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch recent activity from multiple sources
      const { data: comments, error: commentsError } = await supabase
        .from('order_comments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (commentsError) throw commentsError;

      // Transform comments to activity items
      const commentActivities: ActivityItem[] = (comments || []).map((comment: any) => ({
        id: `comment-${comment.id}`,
        action: comment.comment_type === 'internal' ? 'Added internal note' : 'Added comment',
        description: (comment.comment_text || '').substring(0, 50) + (((comment.comment_text || '').length > 50) ? '...' : ''),
        user_name: 'User',
        created_at: comment.created_at,
        action_type: comment.comment_type === 'internal' ? 'note' : 'comment',
        metadata: comment
      }));

      // Add mock status changes for demo
      const mockActivities: ActivityItem[] = [
        {
          id: 'status-1',
          action: 'Changed status to In Progress',
          description: 'Order moved from Pending to In Progress',
          user_name: 'John Smith',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          action_type: 'status_change'
        },
        {
          id: 'edit-1', 
          action: 'Updated vehicle information',
          description: 'Added VIN and updated trim information',
          user_name: 'Mike Johnson',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          action_type: 'edit'
        }
      ];

      // Combine and sort activities
      const allActivities = [...commentActivities, ...mockActivities]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'note':
        return <FileText className="h-4 w-4 text-amber-600" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-purple-600" />;
      case 'file_upload':
        return <Paperclip className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'border-l-green-500 bg-green-50/30';
      case 'comment':
        return 'border-l-blue-500 bg-blue-50/30';
      case 'note':
        return 'border-l-amber-500 bg-amber-50/30';
      case 'edit':
        return 'border-l-purple-500 bg-purple-50/30';
      case 'file_upload':
        return 'border-l-orange-500 bg-orange-50/30';
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
          <Activity className="h-5 w-5 text-primary" />
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
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
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