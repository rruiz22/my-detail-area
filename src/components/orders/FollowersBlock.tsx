import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Mail,
  Phone,
  UserMinus,
  Bell,
  BellOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFollowers } from '@/hooks/useFollowers';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { AddFollowerModal } from '@/components/followers/AddFollowerModal';
import { toast } from 'sonner';

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
      toast.success(t('followers.added_successfully', 'Follower added successfully'));
      setShowAddModal(false);
    } catch (error) {
      toast.error(t('followers.add_failed', 'Failed to add follower'));
    }
  };

  // Handle removing follower
  const handleRemoveFollower = async (userId: string) => {
    try {
      await removeFollower(userId);
      toast.success(t('followers.removed_successfully'));
    } catch (error) {
      toast.error(t('followers.remove_failed'));
    }
  };

  // Handle notification level change
  const handleNotificationChange = async (userId: string, level: string) => {
    try {
      await updateNotificationLevel(userId, level);
      toast.success(t('followers.notification_updated'));
    } catch (error) {
      toast.error(t('followers.notification_update_failed'));
    }
  };

  const getFollowTypeIcon = (followType: string) => {
    switch (followType) {
      case 'assigned': return <Crown className="h-3 w-3 text-yellow-600" />;
      case 'creator': return <Shield className="h-3 w-3 text-blue-600" />;
      case 'manual': return <Users className="h-3 w-3 text-green-600" />;
      case 'interested': return <Bell className="h-3 w-3 text-purple-600" />;
      default: return <Users className="h-3 w-3 text-gray-600" />;
    }
  };

  const getFollowTypeBadgeColor = (followType: string) => {
    switch (followType) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'creator': return 'bg-blue-100 text-blue-800';
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('order_detail.followers', 'Followers')}
          </div>
          <Badge variant="outline" className="text-xs">
            {followersCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {error && (
          <div className="text-center py-4 text-red-600">
            <p className="text-xs">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">{t('followers.loading', 'Loading team...')}</p>
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('followers.no_followers', 'No followers')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              {t('followers.add_team_member', 'Add Team Member')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {followers.slice(0, 4).map((follower) => (
                <div key={follower.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <AvatarSystem
                      name={`${follower.firstName} ${follower.lastName}`}
                      firstName={follower.firstName}
                      lastName={follower.lastName}
                      email={follower.email}
                      seed={follower.avatarUrl as any} // avatarUrl now contains avatar_seed
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {follower.firstName} {follower.lastName}
                        </span>
                        {follower.isPrimary && (
                          <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-xs ${getFollowTypeBadgeColor(follower.followType)}`}>
                          {getFollowTypeIcon(follower.followType)}
                          <span className="ml-1 capitalize">{follower.followType}</span>
                        </Badge>
                        <div className="cursor-pointer" title={`Notifications: ${follower.notificationLevel}`}>
                          {getNotificationIcon(follower.notificationLevel)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1">
                    {follower.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`mailto:${follower.email}`, '_blank')}
                        title={`Email ${follower.firstName}`}
                      >
                        <Mail className="h-3 w-3 text-blue-600" />
                      </Button>
                    )}
                    {follower.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`tel:${follower.phone}`, '_blank')}
                        title={`Call ${follower.firstName}`}
                      >
                        <Phone className="h-3 w-3 text-green-600" />
                      </Button>
                    )}
                    {follower.followType === 'manual' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveFollower(follower.userId)}
                        title={`Remove ${follower.firstName}`}
                      >
                        <UserMinus className="h-3 w-3 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {t('followers.add_follower', 'Add Follower')}
              </Button>

              {followers.length > 4 && (
                <Button variant="outline" size="sm" className="text-xs">
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