import React from 'react';
import { cn } from '@/lib/utils';

interface UserPresenceIndicatorProps {
  status: 'online' | 'away' | 'busy' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  showRing?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function UserPresenceIndicator({
  status,
  size = 'md',
  showRing = false,
  className = '',
  children
}: UserPresenceIndicatorProps) {
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400'
  };

  const ringColors = {
    online: 'ring-green-500/20 animate-pulse',
    away: 'ring-yellow-500/20',
    busy: 'ring-red-500/20 animate-pulse',
    offline: 'ring-gray-400/20'
  };

  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-10 w-10'
  };

  const indicatorSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const ringSizes = {
    sm: 'ring-2',
    md: 'ring-3',
    lg: 'ring-4'
  };

  if (children) {
    return (
      <div className={cn('relative inline-block', className)}>
        <div className={cn(
          'relative',
          showRing && status !== 'offline' && [
            'rounded-full',
            ringSizes[size],
            ringColors[status]
          ]
        )}>
          {children}
        </div>
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
          indicatorSizes[size],
          statusColors[status]
        )} />
      </div>
    );
  }

  return (
    <div className={cn(
      'relative flex items-center justify-center rounded-full',
      sizes[size],
      showRing && status !== 'offline' && [
        ringSizes[size],
        ringColors[status]
      ],
      statusColors[status],
      className
    )}>
      {status === 'online' && (
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
      )}
      {status === 'busy' && (
        <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse" />
      )}
    </div>
  );
}