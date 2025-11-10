import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Clock, AlertTriangle, Eye } from 'lucide-react';
import { useRecentInvoiceComments, type RecentInvoiceComment } from '@/hooks/useRecentInvoiceComments';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { logger } from '@/utils/logger';

interface InvoiceCommentsTooltipProps {
  invoiceId: string;
  count: number;
  children: React.ReactNode;
  maxPreview?: number;
  onViewAllClick?: () => void;
}

export function InvoiceCommentsTooltip({
  invoiceId,
  count,
  children,
  maxPreview = 3,
  onViewAllClick
}: InvoiceCommentsTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only fetch comments when tooltip is opened
  const { data: comments = [], isLoading, error } = useRecentInvoiceComments({
    invoiceId,
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
  const getUserName = useCallback((comment: RecentInvoiceComment): string => {
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
        <div className="w-[500px]">
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Failed to load comments
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="w-[500px]">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            Loading comments...
          </div>
        </div>
      );
    }

    return (
      <div className="w-[500px]">
        {/* Header */}
        <div className="mb-3 pb-2 border-b border-border">
          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            {count} {count === 1 ? 'Comment' : 'Comments'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Showing {Math.min(maxPreview, comments.length)} most recent
          </p>
        </div>

        {/* Comments list - Inline format matching duplicates */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-all border border-transparent hover:border-accent-foreground"
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
              {/* Avatar */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden">
                <AvatarSystem
                  seed={comment.avatar_seed || comment.user_id}
                  firstName={comment.user_first_name}
                  lastName={comment.user_last_name}
                />
              </div>

              {/* User Name */}
              <div className="font-semibold text-sm text-foreground w-24 flex-shrink-0 truncate">
                {getUserName(comment)}
              </div>

              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(comment.created_at)}</span>
              </div>

              {/* Comment Text */}
              <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                {truncateText(comment.comment_text, 60)}
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
        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground/80 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Click any comment to view invoice details
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
        className="max-w-none p-4"
        sideOffset={8}
        onPointerDownOutside={() => setIsOpen(false)}
        onEscapeKeyDown={() => setIsOpen(false)}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
