import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDealershipUsers } from '@/hooks/useDealershipUsers';

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
  const { getUserById, getDisplayName, getInitials } = useDealershipUsers();
  const user = getUserById(userId);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const avatarElement = (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={user?.avatar_url || undefined} alt={getDisplayName(user)} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials(user)}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip || !user) {
    return avatarElement;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatarElement}
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




