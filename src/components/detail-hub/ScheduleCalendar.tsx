/**
 * ScheduleCalendar Component
 *
 * Week-based calendar view for employee shift scheduling
 * Displays 7-day grid (Monday-Sunday) with time slots
 *
 * Features:
 * - Week navigation (previous/next/today)
 * - Time slot grid (7am-7pm by default)
 * - Visual shift blocks with employee info
 * - Color coding by department
 * - Click to create/edit shifts
 * - Conflict indicators
 * - Responsive design
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { ShiftAssignmentDialog } from "./ShiftAssignmentDialog";
import {
  useWeeklySchedules,
  type DetailHubSchedule
} from "@/hooks/useDetailHubSchedules";
import { useDetailHubEmployees } from "@/hooks/useDetailHubDatabase";

// =====================================================
// TYPES
// =====================================================

interface ScheduleWithEmployee extends DetailHubSchedule {
  employee_name?: string;
  employee_department?: string;
}

interface TimeSlot {
  hour: number;
  label: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIME_SLOTS: TimeSlot[] = [
  { hour: 7, label: "7 AM" },
  { hour: 8, label: "8 AM" },
  { hour: 9, label: "9 AM" },
  { hour: 10, label: "10 AM" },
  { hour: 11, label: "11 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 13, label: "1 PM" },
  { hour: 14, label: "2 PM" },
  { hour: 15, label: "3 PM" },
  { hour: 16, label: "4 PM" },
  { hour: 17, label: "5 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 19, label: "7 PM" },
];

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  detail: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200"
  },
  car_wash: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200"
  },
  service: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200"
  },
  management: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300"
  },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ScheduleCalendar() {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time?: string;
  } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DetailHubSchedule | null>(null);

  // Fetch data
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const { data: schedules = [], isLoading } = useWeeklySchedules(weekStartStr);
  const { data: employees = [] } = useDetailHubEmployees();

  // Generate week days (Monday-Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Enrich schedules with employee data
  const enrichedSchedules = useMemo<ScheduleWithEmployee[]>(() => {
    return schedules.map(schedule => {
      const employee = employees.find(e => e.id === schedule.employee_id);
      return {
        ...schedule,
        employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
        employee_department: employee?.department || 'detail'
      };
    });
  }, [schedules, employees]);

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Dialog handlers
  const handleSlotClick = (date: Date, hour?: number) => {
    const timeStr = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : undefined;
    setSelectedSlot({ date, time: timeStr });
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const handleShiftClick = (schedule: DetailHubSchedule) => {
    setSelectedSlot(null);
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedSlot(null);
    setEditingSchedule(null);
  };

  // Get shifts for a specific day and hour
  const getShiftsForSlot = (date: Date, hour: number) => {
    return enrichedSchedules.filter(schedule => {
      const scheduleDate = parseISO(schedule.shift_date);
      if (!isSameDay(scheduleDate, date)) return false;

      const [startHour] = schedule.shift_start_time.split(':').map(Number);
      const [endHour] = schedule.shift_end_time.split(':').map(Number);

      return hour >= startHour && hour < endHour;
    });
  };

  // Calculate stats
  const weekStats = useMemo(() => {
    const totalShifts = enrichedSchedules.length;
    const uniqueEmployees = new Set(enrichedSchedules.map(s => s.employee_id)).size;
    const totalHours = enrichedSchedules.reduce((sum, s) => {
      const [startH, startM] = s.shift_start_time.split(':').map(Number);
      const [endH, endM] = s.shift_end_time.split(':').map(Number);
      const hours = (endH + endM / 60) - (startH + startM / 60);
      return sum + hours;
    }, 0);

    return { totalShifts, uniqueEmployees, totalHours };
  }, [enrichedSchedules]);

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <Card className="card-enhanced">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {t('detail_hub.schedules.calendar_title')}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {format(weekDays[0], 'MMM dd')} - {format(weekDays[6], 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                aria-label={t('detail_hub.schedules.previous_week')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {t('detail_hub.schedules.today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                aria-label={t('detail_hub.schedules.next_week')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  setSelectedSlot({ date: new Date() });
                  setEditingSchedule(null);
                  setIsDialogOpen(true);
                }}
                size="sm"
                className="ml-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('detail_hub.schedules.add_shift')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Week Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('detail_hub.schedules.total_shifts')}</p>
                <p className="text-lg font-bold text-gray-900">{weekStats.totalShifts}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('detail_hub.schedules.employees_scheduled')}</p>
                <p className="text-lg font-bold text-gray-900">{weekStats.uniqueEmployees}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 rounded-lg bg-amber-100">
                <CheckCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('detail_hub.schedules.total_hours')}</p>
                <p className="text-lg font-bold text-gray-900">{weekStats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="card-enhanced overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-gray-500">{t('detail_hub.common.loading')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                  <div className="p-3 text-xs font-medium text-gray-500 text-center">
                    {t('detail_hub.schedules.time')}
                  </div>
                  {weekDays.map((day, index) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-3 text-center border-l border-gray-200",
                          isToday && "bg-emerald-50"
                        )}
                      >
                        <div className="text-xs font-medium text-gray-500">
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-sm font-bold mt-0.5",
                          isToday ? "text-emerald-700" : "text-gray-900"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots Grid */}
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot.hour}
                    className="grid grid-cols-8 border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Time Label */}
                    <div className="p-2 text-xs font-medium text-gray-500 flex items-start justify-center pt-3">
                      {slot.label}
                    </div>

                    {/* Day Cells */}
                    {weekDays.map((day, dayIndex) => {
                      const shifts = getShiftsForSlot(day, slot.hour);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "min-h-[80px] p-1 border-l border-gray-200 relative cursor-pointer hover:bg-gray-100/50",
                            isToday && "bg-emerald-50/30"
                          )}
                          onClick={() => handleSlotClick(day, slot.hour)}
                        >
                          {shifts.map((shift, shiftIndex) => {
                            const colors = DEPARTMENT_COLORS[shift.employee_department || 'detail'];
                            const isLate = shift.status === 'missed';
                            const isInProgress = shift.status === 'in_progress';

                            return (
                              <div
                                key={shift.id}
                                className={cn(
                                  "p-2 rounded-md border text-xs mb-1 cursor-pointer hover:shadow-md transition-all",
                                  colors.bg,
                                  colors.text,
                                  colors.border,
                                  isInProgress && "ring-2 ring-emerald-500 ring-offset-1"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShiftClick(shift);
                                }}
                                style={{
                                  marginTop: shiftIndex * 2
                                }}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">
                                      {shift.employee_name}
                                    </p>
                                    <p className="text-[10px] opacity-75">
                                      {shift.shift_start_time.slice(0, 5)} - {shift.shift_end_time.slice(0, 5)}
                                    </p>
                                  </div>
                                  {isLate && (
                                    <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                                  )}
                                  {isInProgress && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="card-enhanced">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">
              {t('detail_hub.schedules.departments')}:
            </p>
            <div className="flex items-center gap-3">
              {Object.entries(DEPARTMENT_COLORS).map(([dept, colors]) => (
                <div key={dept} className="flex items-center gap-1.5">
                  <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} />
                  <span className="text-xs text-gray-600 capitalize">
                    {dept.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Assignment Dialog */}
      <ShiftAssignmentDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        schedule={editingSchedule}
        defaultDate={selectedSlot?.date}
        defaultTime={selectedSlot?.time}
      />
    </div>
  );
}

export default ScheduleCalendar;
