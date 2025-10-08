import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, AlertTriangle, Eye } from 'lucide-react';
import { useRecentComments, type RecentComment } from '@/hooks/useRecentComments';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface CommentsTooltipProps {
  orderId: string;
  count: number;
  children: React.ReactNode;
  maxPreview?: number;
  onViewAllClick?: () => void;
}

export function CommentsTooltip({
  orderId,
  count,
  children,
  maxPreview = 3,
  onViewAllClick
}: CommentsTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only fetch comments when tooltip is opened
  const { data: comments = [], isLoading, error } = useRecentComments({
    orderId,
    limit: maxPreview,
    enabled: isOpen && count > 0
  });

  // Don't render tooltip if no comments
  if (count <= 0) {
    return <>{children}</>;
  }

  // Format relative time
  const formatRelativeTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      logger.error('Failed to format relative time', error, { dateString });
      return 'Unknown';
    }
  }, []);

  // Truncate comment text
  const truncateText = useCallback((text: string, maxLength: number = 50): string => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }, []);

  // Get user display name
  const getUserName = useCallback((comment: RecentComment): string => {
    const firstName = comment.user_first_name || '';
    const lastName = comment.user_last_name || '';
    return firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : comment.user_email.split('@')[0];
  }, []);

  // Handle view all click
  const handleViewAllClick = useCallback(() => {
    setIsOpen(false);
    if (onViewAllClick) {
      onViewAllClick();
    }
  }, [onViewAllClick]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    if (error) {
      return (
        <div className="w-80 p-3">
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Failed to load comments
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="w-80 p-3">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            Loading comments...
          </div>
        </div>
      );
    }

    return (
      <div className="w-[400px]">
        {/* Header */}
        <div className="mb-3 pb-2 border-b border-border">
          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            {count} {count === 1 ? 'Comment' : 'Comments'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing {Math.min(maxPreview, comments.length)} most recent
          </p>
        </div>

        {/* Comments list */}
        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <AvatarSystem
                    seed={comment.avatar_seed || comment.user_id}
                    firstName={comment.user_first_name}
                    lastName={comment.user_last_name}
                  />
                </div>
              </div>

              {/* Comment content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {getUserName(comment)}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {truncateText(comment.comment_text, 80)}
                </p>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No comments yet
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="mt-3 pt-2 border-t border-border text-xs text-blue-600 hover:text-blue-700 text-center cursor-pointer transition-colors"
          onClick={handleViewAllClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleViewAllClick();
            }
          }}
        >
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <Eye className="w-3.5 h-3.5" />
            View all comments
          </div>
        </div>
      </div>
    );
  }, [comments, count, maxPreview, isLoading, error, formatRelativeTime, truncateText, getUserName, handleViewAllClick]);

  return (
    <Tooltip
      delayDuration={200}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <TooltipTrigger asChild>
        <div className="inline-block">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className={cn(
          // Glass morphism styling
          "z-[9999] max-w-none p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-lg",
          // Smooth animations
          "animate-in fade-in-0 zoom-in-95 duration-150",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100"
        )}
        sideOffset={8}
        onPointerDownOutside={() => setIsOpen(false)}
        onEscapeKeyDown={() => setIsOpen(false)}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
