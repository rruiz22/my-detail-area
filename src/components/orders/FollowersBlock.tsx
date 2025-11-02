import { AddFollowerModal } from '@/components/followers/AddFollowerModal';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFollowers } from '@/hooks/useFollowers';
import {
    Bell,
    BellOff,
    Crown,
    Mail,
    Phone,
    Shield,
    UserMinus,
    UserPlus,
    Users
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface FollowersBlockProps {
  orderId: string;
  dealerId?: string;
}

export function FollowersBlock({ orderId, dealerId }: FollowersBlockProps) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);

  // Use real followers hook instead of mock data
  const {
    followers,
    loading,
    error,
    addFollower,
    removeFollower,
    updateNotificationLevel,
    isUserFollowing,
    followersCount
  } = useFollowers('order', orderId);

  // Handle adding follower
  const handleAddFollower = async (userId: string, notificationLevel: string = 'important') => {
    try {
      await addFollower(userId, 'manual', notificationLevel);
      toast({ description: t('followers.added_successfully', 'Follower added successfully') });
      setShowAddModal(false);
    } catch (error) {
      toast({ variant: 'destructive', description: t('followers.add_failed', 'Failed to add follower') });
    }
  };

  // Handle removing follower
  const handleRemoveFollower = async (userId: string) => {
    try {
      await removeFollower(userId);
      toast({ description: t('followers.removed_successfully') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('followers.remove_failed') });
    }
  };

  // Handle notification level change
  const handleNotificationChange = async (userId: string, level: string) => {
    try {
      await updateNotificationLevel(userId, level);
      toast({ description: t('followers.notification_updated') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('followers.notification_update_failed') });
    }
  };

  const getFollowTypeIcon = (followType: string) => {
    switch (followType) {
      case 'assigned': return <Crown className="h-3 w-3 text-yellow-600" />;
      case 'creator': return <Shield className="h-3 w-3 text-gray-700" />;
      case 'manual': return <Users className="h-3 w-3 text-green-600" />;
      case 'interested': return <Bell className="h-3 w-3 text-purple-600" />;
      default: return <Users className="h-3 w-3 text-gray-600" />;
    }
  };

  const getFollowTypeBadgeColor = (followType: string) => {
    switch (followType) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'creator': return 'bg-gray-100 text-gray-800';
      case 'manual': return 'bg-green-100 text-green-800';
      case 'interested': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationIcon = (level: string) => {
    switch (level) {
      case 'all': return <Bell className="h-3 w-3 text-green-600" />;
      case 'important': return <Bell className="h-3 w-3 text-yellow-600" />;
      case 'none': return <BellOff className="h-3 w-3 text-gray-400" />;
      default: return <Bell className="h-3 w-3 text-gray-600" />;
    }
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-4 bg-gradient-to-br from-background to-muted/20">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">{t('order_detail.followers', 'Followers')}</span>
          </div>
          <Badge variant="secondary" className="text-xs font-bold px-2.5 py-1">
            {followersCount}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {error && (
          <div className="text-center py-4 px-3 rounded-xl bg-red-50 border-2 border-red-200">
            <div className="p-2 rounded-lg bg-red-100 inline-block mb-2">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 px-3 rounded-xl bg-muted/40 border border-border/50">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-medium text-foreground">{t('followers.loading', 'Loading team...')}</p>
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl bg-muted/40 border-2 border-dashed border-border">
            <div className="p-3 rounded-lg bg-muted/60 inline-block mb-3">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-3">{t('followers.no_followers', 'No followers')}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto font-medium shadow-sm hover:shadow-md transition-shadow"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('followers.add_team_member', 'Add Team Member')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {followers.slice(0, 4).map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-background to-muted/30 border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="ring-2 ring-primary/10 rounded-full">
                      <AvatarSystem
                        name={`${follower.firstName} ${follower.lastName}`}
                        firstName={follower.firstName}
                        lastName={follower.lastName}
                        email={follower.email}
                        seed={follower.avatarUrl as any} // avatarUrl now contains avatar_seed
                        size={36}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-bold text-foreground truncate">
                          {follower.firstName} {follower.lastName}
                        </span>
                        {follower.isPrimary && (
                          <div className="p-1 rounded bg-yellow-100">
                            <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className={`text-xs font-medium px-2 py-0.5 ${getFollowTypeBadgeColor(follower.followType)}`}>
                          {getFollowTypeIcon(follower.followType)}
                          <span className="ml-1 capitalize">{follower.followType}</span>
                        </Badge>
                        <div
                          className="cursor-pointer p-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          title={`Notifications: ${follower.notificationLevel}`}
                        >
                          {getNotificationIcon(follower.notificationLevel)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1 ml-2">
                    {follower.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                        onClick={() => window.open(`mailto:${follower.email}`, '_blank')}
                        title={`Email ${follower.firstName}`}
                      >
                        <Mail className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {follower.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-green-100"
                        onClick={() => window.open(`tel:${follower.phone}`, '_blank')}
                        title={`Call ${follower.firstName}`}
                      >
                        <Phone className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {follower.followType === 'manual' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        onClick={() => handleRemoveFollower(follower.userId)}
                        title={`Remove ${follower.firstName}`}
                      >
                        <UserMinus className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('followers.add_follower', 'Add Follower')}
              </Button>

              {followers.length > 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium px-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  {t('followers.view_all', 'View All')} ({followersCount})
                </Button>
              )}
            </div>
          </>
        )}

        {/* Add Follower Modal */}
        <AddFollowerModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddFollower={handleAddFollower}
          existingFollowerIds={followers.map(f => f.userId)}
          dealerId={dealerId}
        />
      </CardContent>
    </Card>
  );
}
