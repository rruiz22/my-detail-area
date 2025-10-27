import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EntityFollower } from '@/hooks/useEntityFollowers';
import { UserPresenceIndicator } from '../presence/UserPresenceIndicator';

interface FollowersAvatarStackProps {
  followers: EntityFollower[];
  maxVisible?: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FollowersAvatarStack({
  followers,
  maxVisible = 3,
  showCount = false,
  size = 'sm',
  className = ''
}: FollowersAvatarStackProps) {
  const visibleFollowers = followers.slice(0, maxVisible);
  const remainingCount = Math.max(0, followers.length - maxVisible);

  const sizePixels = {
    sm: 24,
    md: 32,
    lg: 40
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const offsetClasses = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4'
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        <div className="flex">
          {visibleFollowers.map((follower, index) => (
            <Tooltip key={follower.id}>
              <TooltipTrigger asChild>
                <div
                  className={`relative ${index > 0 ? offsetClasses[size] : ''} transition-transform hover:scale-110 hover:z-10`}
                  style={{ zIndex: visibleFollowers.length - index }}
                >
                  <UserPresenceIndicator
                    status={follower.presence_status as 'online' | 'away' | 'busy' | 'offline'}
                    size={size}
                    showRing
                  >
                    <div className={`${sizeClasses[size]} border-2 border-background rounded-full overflow-hidden`}>
                      <AvatarSystem
                        name={follower.user_name}
                        email={follower.user_email}
                        seed={follower.avatar_seed as any}
                        size={sizePixels[size]}
                      />
                    </div>
                  </UserPresenceIndicator>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{follower.user_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {follower.user_email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Following since {new Date(follower.followed_at).toLocaleDateString()}
                  </div>
                  <Badge
                    variant="outline"
                    className="mt-1 text-xs"
                  >
                    {follower.notification_level}
                  </Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`relative ${offsetClasses[size]} transition-transform hover:scale-110`}
                  style={{ zIndex: 0 }}
                >
                  <Avatar className={`${sizeClasses[size]} border-2 border-background bg-muted`}>
                    <AvatarFallback className="text-xs font-medium">
                      +{remainingCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">
                    {remainingCount} more follower{remainingCount === 1 ? '' : 's'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {followers.length} total followers
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {showCount && (
          <Badge
            variant="secondary"
            className="ml-3 text-xs"
          >
            {followers.length} follower{followers.length === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
