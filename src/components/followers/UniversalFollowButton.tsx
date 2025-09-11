import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellOff, Users, Heart, HeartOff, Settings } from 'lucide-react';
import { useEntityFollowers } from '@/hooks/useEntityFollowers';
import { FollowersAvatarStack } from './FollowersAvatarStack';

interface UniversalFollowButtonProps {
  entityType: string;
  entityId: string;
  dealerId: number;
  variant?: 'default' | 'compact' | 'icon-only';
  showCount?: boolean;
  showFollowers?: boolean;
  className?: string;
}

export function UniversalFollowButton({
  entityType,
  entityId,
  dealerId,
  variant = 'default',
  showCount = true,
  showFollowers = true,
  className = ''
}: UniversalFollowButtonProps) {
  const {
    followers,
    followerCount,
    isFollowing,
    loading,
    followEntity,
    unfollowEntity,
    updateNotificationLevel
  } = useEntityFollowers(entityType, entityId, dealerId);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFollow = async () => {
    setIsProcessing(true);
    try {
      await followEntity('all');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnfollow = async () => {
    setIsProcessing(true);
    try {
      await unfollowEntity();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotificationLevelChange = async (level: string) => {
    setIsProcessing(true);
    try {
      await updateNotificationLevel(level);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentFollower = followers.find(f => f.user_id === entityId); // This should be current user ID
  const notificationLevel = currentFollower?.notification_level || 'all';

  if (variant === 'icon-only') {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={isFollowing ? "default" : "outline"}
          size="sm"
          onClick={isFollowing ? handleUnfollow : handleFollow}
          disabled={loading || isProcessing}
          className={className}
        >
          {isFollowing ? (
            <Heart className="h-4 w-4 fill-current" />
          ) : (
            <HeartOff className="h-4 w-4" />
          )}
        </Button>
        
        {showCount && followerCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {followerCount}
          </Badge>
        )}
        
        {showFollowers && followers.length > 0 && (
          <FollowersAvatarStack 
            followers={followers} 
            maxVisible={3}
          />
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isFollowing ? "default" : "outline"}
              size="sm"
              disabled={loading}
              className={className}
            >
              <Users className="h-4 w-4 mr-1" />
              {isFollowing ? 'Following' : 'Follow'}
              {showCount && followerCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {followerCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end">
            {!isFollowing ? (
              <DropdownMenuItem onClick={handleFollow} disabled={isProcessing}>
                <Heart className="h-4 w-4 mr-2" />
                Follow {entityType}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={handleUnfollow} disabled={isProcessing}>
                  <HeartOff className="h-4 w-4 mr-2" />
                  Unfollow
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => handleNotificationLevelChange('all')}
                  disabled={isProcessing}
                >
                  <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'all' ? 'text-primary' : ''}`} />
                  All notifications
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleNotificationLevelChange('important')}
                  disabled={isProcessing}
                >
                  <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'important' ? 'text-primary' : ''}`} />
                  Important only
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleNotificationLevelChange('mentions')}
                  disabled={isProcessing}
                >
                  <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'mentions' ? 'text-primary' : ''}`} />
                  Mentions only
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleNotificationLevelChange('none')}
                  disabled={isProcessing}
                >
                  <BellOff className={`h-4 w-4 mr-2 ${notificationLevel === 'none' ? 'text-primary' : ''}`} />
                  No notifications
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {showFollowers && followers.length > 0 && (
          <FollowersAvatarStack 
            followers={followers} 
            maxVisible={3}
          />
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isFollowing ? "default" : "outline"}
            disabled={loading}
            className={className}
          >
            <Users className="h-4 w-4 mr-2" />
            {isFollowing ? 'Following' : 'Follow'}
            {showCount && followerCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {followerCount}
              </Badge>
            )}
            <Settings className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          {!isFollowing ? (
            <DropdownMenuItem onClick={handleFollow} disabled={isProcessing}>
              <Heart className="h-4 w-4 mr-2" />
              Follow this {entityType}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={handleUnfollow} disabled={isProcessing}>
                <HeartOff className="h-4 w-4 mr-2" />
                Unfollow
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                Notification Level
              </div>
              
              <DropdownMenuItem 
                onClick={() => handleNotificationLevelChange('all')}
                disabled={isProcessing}
              >
                <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'all' ? 'text-primary' : ''}`} />
                All notifications
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleNotificationLevelChange('important')}
                disabled={isProcessing}
              >
                <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'important' ? 'text-primary' : ''}`} />
                Important only
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleNotificationLevelChange('mentions')}
                disabled={isProcessing}
              >
                <Bell className={`h-4 w-4 mr-2 ${notificationLevel === 'mentions' ? 'text-primary' : ''}`} />
                Mentions only
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleNotificationLevelChange('none')}
                disabled={isProcessing}
              >
                <BellOff className={`h-4 w-4 mr-2 ${notificationLevel === 'none' ? 'text-primary' : ''}`} />
                No notifications
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {showFollowers && followers.length > 0 && (
        <FollowersAvatarStack 
          followers={followers} 
          maxVisible={4}
          showCount
        />
      )}
    </div>
  );
}