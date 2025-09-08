import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  UserCheck, 
  Clock,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivity {
  id: string;
  type: 'user_joined' | 'role_assigned' | 'invitation_sent' | 'user_activated';
  description: string;
  timestamp: string;
  user?: string;
  metadata?: any;
}

interface UserActivityFeedProps {
  activities: RecentActivity[];
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({ activities }) => {
  const { t } = useTranslation();

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'role_assigned':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'invitation_sent':
        return <Mail className="h-4 w-4 text-yellow-600" />;
      case 'user_activated':
        return <UserCheck className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityBadgeVariant = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_joined':
        return 'default';
      case 'role_assigned':
        return 'secondary';
      case 'invitation_sent':
        return 'outline';
      case 'user_activated':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getActivityBadgeText = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_joined':
        return 'New User';
      case 'role_assigned':
        return 'Role Update';
      case 'invitation_sent':
        return 'Invitation';
      case 'user_activated':
        return 'Activated';
      default:
        return 'Activity';
    }
  };

  const getUserInitials = (email?: string) => {
    if (!email) return 'U';
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              User activities will appear here when they occur
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs">
                  {getUserInitials(activity.user)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getActivityIcon(activity.type)}
                  <Badge variant={getActivityBadgeVariant(activity.type)} className="text-xs">
                    {getActivityBadgeText(activity.type)}
                  </Badge>
                </div>
                
                <p className="text-sm font-medium text-foreground mb-1">
                  {activity.description}
                </p>
                
                {activity.user && (
                  <p className="text-sm text-muted-foreground mb-2">
                    User: {activity.user}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More Button */}
        {activities.length > 5 && (
          <div className="mt-6 text-center">
            <button className="text-sm text-primary hover:underline">
              View all activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};