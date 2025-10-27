import { AvatarSystem } from '@/components/ui/avatar-system';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDealershipUsers } from '@/hooks/useDealershipUsers';
import React from 'react';

interface UserAvatarProps {
  userId: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  size = 'md',
  showTooltip = true,
  className = ''
}) => {
  const { getUserById, getDisplayName } = useDealershipUsers();
  const user = getUserById(userId);

  const sizePixels = {
    sm: 24,
    md: 32,
    lg: 40
  };

  const avatarElement = (
    <AvatarSystem
      name={user?.email || 'User'}
      firstName={user?.first_name}
      lastName={user?.last_name}
      email={user?.email}
      seed={user?.avatar_seed as any}
      size={sizePixels[size]}
      className={className}
    />
  );

  if (!showTooltip || !user) {
    return avatarElement;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            {avatarElement}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{getDisplayName(user)}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
