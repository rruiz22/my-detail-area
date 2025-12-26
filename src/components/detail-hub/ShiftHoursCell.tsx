/**
 * Shift Hours Cell Component
 *
 * Displays employee shift hours and dealership assignments in a compact card format.
 * Shows ALL assignments with: shift hours, work days, break info, and auto-close status.
 */

import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle, Bell, Coffee, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScheduleTemplate {
  shift_start_time: string;
  shift_end_time: string;
  days_of_week: number[];
  early_punch_allowed_minutes: number | null;
  late_punch_grace_minutes: number | null;
  required_break_minutes: number;
  break_is_paid: boolean;
  // Auto-close configuration
  auto_close_enabled?: boolean;
  auto_close_first_reminder?: number;
  auto_close_second_reminder?: number;
  auto_close_window_minutes?: number;
}

interface Dealership {
  id: number;
  name: string;
  logo_url: string | null;
}

interface Assignment {
  id: string;
  employee_id: string;
  dealership_id: number;
  schedule_template: ScheduleTemplate;
  status: 'active' | 'inactive' | 'suspended';
  dealership: Dealership;
}

interface ShiftHoursCellProps {
  /** Employee ID */
  employeeId: string;

  /** Array of employee assignments (can be empty) */
  assignments: Assignment[];
}

/**
 * Helper function to format punch window display
 */
function formatPunchWindow(
  early: number | null | undefined,
  late: number | null | undefined
): string {
  // Use != null to check that value is neither null nor undefined
  const earlyStr = early != null ? `-${early}m` : 'No limit';
  const lateStr = late != null ? `+${late}m` : 'No limit';

  return `${earlyStr} / ${lateStr}`;
}

/**
 * Helper function to format days of week in compact format
 * Returns: "Mon-Sat" or "Mon, Wed, Fri" etc.
 */
function formatDaysOfWeek(days: number[] | undefined): string {
  if (!days || days.length === 0) return 'No days';
  if (days.length === 7) return 'All days';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedDays = [...days].sort((a, b) => a - b);

  // Check if days are consecutive
  let isConsecutive = true;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] !== sortedDays[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive && sortedDays.length > 2) {
    // Show as range: "Mon-Sat"
    return `${dayNames[sortedDays[0]]}-${dayNames[sortedDays[sortedDays.length - 1]]}`;
  }

  // Show as list: "Mon, Wed, Fri"
  return sortedDays.map(d => dayNames[d]).join(', ');
}

/**
 * Renders a single assignment card with all information
 */
function AssignmentCard({
  assignment,
  t
}: {
  assignment: Assignment;
  t: (key: string) => string;
}) {
  const punchWindow = formatPunchWindow(
    assignment.schedule_template.early_punch_allowed_minutes,
    assignment.schedule_template.late_punch_grace_minutes
  );
  const daysDisplay = formatDaysOfWeek(assignment.schedule_template.days_of_week);
  const breakMinutes = assignment.schedule_template.required_break_minutes ?? 0;
  const breakIsPaid = assignment.schedule_template.break_is_paid;
  const autoCloseEnabled = assignment.schedule_template.auto_close_enabled ?? false;

  return (
    <div className="p-2 bg-gray-50 rounded-md border border-gray-100 space-y-1.5">
      {/* Header: Dealer + Shift Hours */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {assignment.dealership.logo_url && (
            <img
              src={assignment.dealership.logo_url}
              alt=""
              className="h-4 w-4 object-contain"
            />
          )}
          <span className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">
            {assignment.dealership.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
          <Clock className="h-3 w-3 text-gray-500" />
          {assignment.schedule_template.shift_start_time} - {assignment.schedule_template.shift_end_time}
        </div>
      </div>

      {/* Details Row: Days, Break, Punch Window */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        {/* Days */}
        <span className="flex items-center gap-0.5" title="Work days">
          <Calendar className="h-2.5 w-2.5" />
          {daysDisplay}
        </span>

        {/* Break */}
        <span className="flex items-center gap-0.5" title={breakIsPaid ? 'Paid break' : 'Unpaid break'}>
          <Coffee className="h-2.5 w-2.5" />
          {breakMinutes}m {breakIsPaid ? '(P)' : '(U)'}
        </span>

        {/* Punch Window */}
        <span title="Punch window (early/late)">
          {punchWindow}
        </span>
      </div>

      {/* Auto-Close Indicator */}
      {autoCloseEnabled ? (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="h-4 px-1 text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
            <Bell className="h-2 w-2 mr-0.5" />
            Auto-Close {assignment.schedule_template.auto_close_first_reminder ?? 30}/{assignment.schedule_template.auto_close_window_minutes ?? 60}m
          </Badge>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[9px] text-gray-400">
          <Bell className="h-2 w-2" />
          Auto-Close: Off
        </div>
      )}
    </div>
  );
}

/**
 * Displays shift hours and dealer assignments in a compact table cell format
 * Shows ALL assignments with complete information
 */
export function ShiftHoursCell({
  employeeId,
  assignments
}: ShiftHoursCellProps) {
  const { t } = useTranslation();

  // Filter only active assignments
  const activeAssignments = assignments?.filter(a => a.status === 'active') || [];

  // Edge Case 1: No assignments at all
  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{t('detail_hub.employees.no_assignments')}</span>
      </div>
    );
  }

  // Edge Case 2: All assignments are inactive
  if (activeAssignments.length === 0) {
    return (
      <Badge variant="secondary" className="text-amber-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        {t('detail_hub.employees.no_active_assignments')}
      </Badge>
    );
  }

  // Show ALL active assignments
  return (
    <div className="space-y-1.5 max-w-[280px]">
      {activeAssignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          t={t}
        />
      ))}
    </div>
  );
}
