import React from 'react';
import { getDuplicateBadgeColor } from '@/utils/duplicateUtils';
import { cn } from '@/lib/utils';

interface DuplicateBadgeProps {
  count: number;
  className?: string;
}

export function DuplicateBadge({ count, className }: DuplicateBadgeProps) {
  // Don't render badge if no duplicates
  if (count <= 1) return null;
  
  const colors = getDuplicateBadgeColor(count);
  
  return (
    <div 
      className={cn(
        "absolute -top-2 -right-5 flex items-center justify-center min-w-[20px] h-[20px] rounded-full text-[10px] font-bold leading-none z-20 shadow-lg border-2",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
      title={`${count} duplicate entries`}
    >
      ×{count}
    </div>
  );
}