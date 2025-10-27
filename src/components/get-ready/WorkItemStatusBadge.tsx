import { Badge } from '@/components/ui/badge';
import type { WorkItemStatus } from '@/hooks/useVehicleWorkItems';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Ban,
    Calendar,
    CheckCheck,
    Circle,
    Clock,
    Pause,
    XCircle,
    type LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatusConfig {
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  phase: 'pre-work' | 'execution' | 'completion';
}

// ✨ Notion-style Status Configuration (No gradients, muted colors)
const statusConfig: Record<WorkItemStatus, StatusConfig> = {
  // Pre-Work Phase
  pending: {
    icon: Circle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-900 dark:text-yellow-100',
    phase: 'pre-work',
  },
  awaiting_approval: {
    icon: Clock,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-900 dark:text-amber-100',
    phase: 'pre-work',
  },
  rejected: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-500',
    textColor: 'text-red-900 dark:text-red-100',
    phase: 'pre-work',
  },
  scheduled: {
    icon: Calendar,
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-500',
    textColor: 'text-violet-900 dark:text-violet-100',
    phase: 'pre-work',
  },

  // Execution Phase
  in_progress: {
    icon: Circle,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-900 dark:text-blue-100',
    phase: 'execution',
  },
  on_hold: {
    icon: Pause,
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-900 dark:text-gray-100',
    phase: 'execution',
  },
  blocked: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-900 dark:text-orange-100',
    phase: 'execution',
  },

  // Completion Phase
  completed: {
    icon: CheckCheck,
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-500',
    textColor: 'text-green-900 dark:text-green-100',
    phase: 'completion',
  },
  cancelled: {
    icon: Ban,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-700 dark:text-gray-300',
    phase: 'completion',
  },
};

interface WorkItemStatusBadgeProps {
  status: WorkItemStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  approval_required?: boolean;
  approval_status?: string | null;
}

export function WorkItemStatusBadge({
  status,
  className,
  showIcon = true,
  size = 'md',
  approval_required,
  approval_status,
}: WorkItemStatusBadgeProps) {
  const { t } = useTranslation();

  // Calculate visual status for dynamic badge display
  const getVisualStatus = (): WorkItemStatus => {
    // ✅ FIXED: Check for status='rejected' directly (not cancelled + rejected)
    if (status === 'rejected') {
      return 'rejected';
    }
    if (status === 'pending' && approval_required) {
      if (!approval_status) return 'awaiting_approval';
      if (approval_status === 'approved') return 'approved';
    }
    return status;
  };

  const visualStatus = getVisualStatus();
  const config = statusConfig[visualStatus];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border-2 transition-colors',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      {t(`get_ready.work_items.status.${status}`)}
    </Badge>
  );
}

// Helper function to get status icon for use in other components
export function getStatusIcon(status: WorkItemStatus): LucideIcon {
  return statusConfig[status].icon;
}

// Helper function to get status color for use in borders/backgrounds
export function getStatusColor(status: WorkItemStatus) {
  return statusConfig[status];
}
