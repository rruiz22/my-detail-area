/**
 * Shift Hours Cell Component
 *
 * Displays employee shift hours and dealership assignments in a compact format.
 * Handles multiple assignments with popover expansion.
 */

import { useTranslation } from 'react-i18next';
import { Clock, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

interface ScheduleTemplate {
  shift_start_time: string;
  shift_end_time: string;
  days_of_week: number[];
  early_punch_allowed_minutes: number | null;
  late_punch_grace_minutes: number | null;
  required_break_minutes: number;
  break_is_paid: boolean;
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
  early: number | null,
  late: number | null
): string | null {
  if (early === null && late === null) return null;

  const earlyStr = early !== null ? `-${early}m` : 'No limit';
  const lateStr = late !== null ? `+${late}m` : 'No limit';

  return `${earlyStr} / ${lateStr}`;
}

/**
 * Displays shift hours and dealer assignments in a compact table cell format
 * Shows primary assignment inline, additional assignments in popover
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

  // Get primary (first active) assignment
  const primary = activeAssignments[0];
  const remainingCount = activeAssignments.length - 1;

  // Check if schedule is flexible (no time restrictions)
  const isFlexible =
    primary.schedule_template.early_punch_allowed_minutes === null &&
    primary.schedule_template.late_punch_grace_minutes === null;

  // Format punch window for primary assignment
  const punchWindow = formatPunchWindow(
    primary.schedule_template.early_punch_allowed_minutes,
    primary.schedule_template.late_punch_grace_minutes
  );

  // Single assignment - show directly
  if (activeAssignments.length === 1) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {primary.dealership.logo_url && (
            <img
              src={primary.dealership.logo_url}
              alt=""
              className="h-4 w-4 object-contain"
            />
          )}
          <Clock className="h-3 w-3 text-gray-500" />
          <span className="text-sm font-medium">
            {primary.schedule_template.shift_start_time} -{' '}
            {primary.schedule_template.shift_end_time}
          </span>
          {isFlexible && (
            <Badge variant="outline" className="text-xs">
              {t('detail_hub.employees.flexible_schedule')}
            </Badge>
          )}
        </div>
        {punchWindow && (
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-5">
            <span>{t('detail_hub.employees.punch_window')}: {punchWindow}</span>
          </div>
        )}
      </div>
    );
  }

  // Multiple assignments - show primary + popover
  return (
    <div className="space-y-1">
      {/* Primary assignment - always visible */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {primary.dealership.logo_url && (
            <img
              src={primary.dealership.logo_url}
              alt=""
              className="h-4 w-4 object-contain"
            />
          )}
          <Clock className="h-3 w-3 text-gray-500" />
          <span className="text-sm font-medium">
            {primary.schedule_template.shift_start_time} -{' '}
            {primary.schedule_template.shift_end_time}
          </span>
        </div>
        {punchWindow && (
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-5">
            <span>{t('detail_hub.employees.punch_window')}: {punchWindow}</span>
          </div>
        )}
      </div>

      {/* Additional assignments - in popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900">
            <Building2 className="h-3 w-3 mr-1" />
            {t('detail_hub.employees.multiple_locations', { count: remainingCount })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('detail_hub.employees.all_assignments')}</h4>
            <div className="space-y-2">
              {activeAssignments.map((assignment) => {
                const assignmentPunchWindow = formatPunchWindow(
                  assignment.schedule_template.early_punch_allowed_minutes,
                  assignment.schedule_template.late_punch_grace_minutes
                );

                return (
                  <div
                    key={assignment.id}
                    className="p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {assignment.dealership.logo_url && (
                          <img
                            src={assignment.dealership.logo_url}
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                        )}
                        <span className="text-sm font-medium">{assignment.dealership.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {assignment.schedule_template.shift_start_time} - {assignment.schedule_template.shift_end_time}
                      </div>
                    </div>
                    {assignmentPunchWindow && (
                      <div className="text-xs text-gray-500 ml-7">
                        {t('detail_hub.employees.punch_window')}: {assignmentPunchWindow}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
