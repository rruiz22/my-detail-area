import { safeParseDate } from './dateUtils';

interface OverdueStatus {
  isOverdue: boolean;
  hoursOverdue: number;
  daysOverdue: number;
  displayText: string;
  severity: 'on_time' | 'due_soon' | 'due_today' | 'overdue_hours' | 'overdue_days';
}

/**
 * Enhanced overdue calculation with hour-level precision
 */
export const calculateOverdueStatus = (dueDateString?: string | null): OverdueStatus | null => {
  const dueDate = safeParseDate(dueDateString);

  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - dueDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Not overdue yet
  if (diffMs <= 0) {
    const hoursUntilDue = Math.abs(diffHours);

    if (hoursUntilDue < 2) {
      return {
        isOverdue: false,
        hoursOverdue: 0,
        daysOverdue: 0,
        displayText: `Due in ${Math.ceil(hoursUntilDue * 60)} minutes`,
        severity: 'due_soon'
      };
    } else if (hoursUntilDue < 24) {
      return {
        isOverdue: false,
        hoursOverdue: 0,
        daysOverdue: 0,
        displayText: `Due in ${Math.ceil(hoursUntilDue)} hours`,
        severity: 'due_today'
      };
    } else {
      const daysUntil = Math.ceil(hoursUntilDue / 24);
      return {
        isOverdue: false,
        hoursOverdue: 0,
        daysOverdue: 0,
        displayText: `Due in ${daysUntil} days`,
        severity: 'on_time'
      };
    }
  }

  // Overdue
  const hoursOverdue = Math.floor(diffHours);
  const daysOverdue = Math.floor(diffDays);

  if (hoursOverdue < 24) {
    return {
      isOverdue: true,
      hoursOverdue,
      daysOverdue: 0,
      displayText: `${hoursOverdue} hours overdue`,
      severity: 'overdue_hours'
    };
  } else {
    const remainingHours = hoursOverdue % 24;
    return {
      isOverdue: true,
      hoursOverdue,
      daysOverdue,
      displayText: remainingHours > 0
        ? `${daysOverdue} days, ${remainingHours} hours overdue`
        : `${daysOverdue} days overdue`,
      severity: 'overdue_days'
    };
  }
};

/**
 * Get due date status with enhanced precision
 */
export const getEnhancedDueDateStatus = (dueDateString?: string | null, t: any) => {
  const overdueStatus = calculateOverdueStatus(dueDateString);

  if (!overdueStatus) {
    return null;
  }

  if (overdueStatus.isOverdue) {
    return {
      status: 'overdue' as const,
      text: overdueStatus.displayText,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: 'AlertTriangle',
      badge: 'OVERDUE',
      severity: overdueStatus.severity
    };
  }

  switch (overdueStatus.severity) {
    case 'due_soon':
      return {
        status: 'due_soon' as const,
        text: overdueStatus.displayText,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: 'AlertTriangle',
        badge: 'DUE NOW',
        severity: overdueStatus.severity
      };

    case 'due_today':
      return {
        status: 'due_today' as const,
        text: overdueStatus.displayText,
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: 'Clock',
        badge: 'DUE TODAY',
        severity: overdueStatus.severity
      };

    default:
      return {
        status: 'on_time' as const,
        text: overdueStatus.displayText,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: 'CheckCircle',
        badge: 'ON TIME',
        severity: overdueStatus.severity
      };
  }
};
