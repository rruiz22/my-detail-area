import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StickyNote, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesTooltipProps {
  noteContent: string | null;
  children: React.ReactNode;
  onViewClick?: () => void;
}

/**
 * NotesTooltip Component
 *
 * Displays a tooltip with the order's internal notes content.
 * Similar to CommentsTooltip but for static note field.
 *
 * Features:
 * - Shows note preview on hover
 * - Truncates long notes with ellipsis
 * - Click to view full order details
 * - Matches design system of CommentsTooltip
 *
 * @component
 */
export function NotesTooltip({
  noteContent,
  children,
  onViewClick
}: NotesTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render tooltip if no note content
  if (!noteContent || noteContent.trim() === '') {
    return <>{children}</>;
  }

  // Truncate note text for preview
  const truncateText = useCallback((text: string, maxLength: number = 150): string => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }, []);

  // Handle view click
  const handleViewClick = useCallback(() => {
    setIsOpen(false);
    if (onViewClick) {
      onViewClick();
    }
  }, [onViewClick]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    return (
      <div className="w-[500px]">
        {/* Header */}
        <div className="mb-3 pb-2 border-b border-border">
          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-500" />
            Order Note
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Note added during order creation
          </p>
        </div>

        {/* Note Content */}
        <div
          className={cn(
            "group px-3 py-2.5 rounded-md bg-amber-50/50 dark:bg-amber-950/20",
            "border border-amber-200 dark:border-amber-800",
            "hover:bg-amber-100/50 dark:hover:bg-amber-950/30",
            "cursor-pointer transition-all",
            onViewClick && "cursor-pointer"
          )}
          onClick={handleViewClick}
          role={onViewClick ? "button" : undefined}
          tabIndex={onViewClick ? 0 : undefined}
          onKeyDown={onViewClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleViewClick();
            }
          } : undefined}
        >
          <div className="text-sm text-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">
            {truncateText(noteContent, 300)}
          </div>
        </div>

        {/* Footer */}
        {onViewClick && (
          <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground/80 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Click to view full order details
            </div>
          </div>
        )}
      </div>
    );
  }, [noteContent, truncateText, handleViewClick, onViewClick]);

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
