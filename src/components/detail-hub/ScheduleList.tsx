/**
 * ScheduleList Component
 *
 * Alternative list view for employee schedules (mobile-friendly)
 * Groups schedules by date with filtering and sorting
 *
 * Features:
 * - Date grouping (Today, Tomorrow, This Week, etc.)
 * - Employee filtering
 * - Status filtering
 * - Department filtering
 * - Quick actions (edit, delete, duplicate)
 * - Empty states
 * - Responsive design
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Clock,
  User,
  Monitor,
  Coffee,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Building2,
  Plus
} from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isThisWeek,
  startOfDay,
  addDays,
  differenceInDays
} from "date-fns";
import { cn } from "@/lib/utils";
import { ShiftAssignmentDialog } from "./ShiftAssignmentDialog";
import {
  useDetailHubSchedules,
  useDeleteSchedule,
  type DetailHubSchedule,
} from "@/hooks/useDetailHubSchedules";
import { useDetailHubEmployees } from "@/hooks/useDetailHubDatabase";
import { useDetailHubKiosks } from "@/hooks/useDetailHubKiosks";

// =====================================================
// TYPES
// =====================================================

interface ScheduleWithEmployee extends DetailHubSchedule {
  employee_name: string;
  employee_department: string;
  employee_photo?: string;
  kiosk_name?: string;
}

type StatusFilter = 'all' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
type DepartmentFilter = 'all' | 'detail' | 'car_wash' | 'service' | 'management';

// =====================================================
// CONSTANTS
// =====================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: CalendarIcon
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    icon: CheckCircle
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Clock
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-200 text-gray-600 border-gray-300',
    icon: CheckCircle
  },
  missed: {
    label: 'Missed',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: AlertCircle
  },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ScheduleList() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DetailHubSchedule | null>(null);

  // Fetch data
  const { data: schedules = [], isLoading } = useDetailHubSchedules();
  const { data: employees = [] } = useDetailHubEmployees();
  const { data: kiosks = [] } = useDetailHubKiosks();
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule();

  // Enrich schedules with employee data
  const enrichedSchedules = useMemo<ScheduleWithEmployee[]>(() => {
    return schedules.map(schedule => {
      const employee = employees.find(e => e.id === schedule.employee_id);
      const kiosk = kiosks.find(k => k.id === schedule.assigned_kiosk_id);

      return {
        ...schedule,
        employee_name: employee
          ? `${employee.first_name} ${employee.last_name}`
          : 'Unknown Employee',
        employee_department: employee?.department || 'detail',
        employee_photo: employee?.fallback_photo_url || undefined,
        kiosk_name: kiosk?.name,
      };
    });
  }, [schedules, employees, kiosks]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return enrichedSchedules.filter(schedule => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        schedule.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || schedule.status === statusFilter;

      // Department filter
      const matchesDepartment =
        departmentFilter === 'all' || schedule.employee_department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [enrichedSchedules, searchTerm, statusFilter, departmentFilter]);

  // Group schedules by date
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, ScheduleWithEmployee[]> = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      upcoming: [],
      past: [],
    };

    const now = startOfDay(new Date());

    filteredSchedules.forEach(schedule => {
      const scheduleDate = parseISO(schedule.shift_date);
      const daysDiff = differenceInDays(scheduleDate, now);

      if (isToday(scheduleDate)) {
        groups.today.push(schedule);
      } else if (isTomorrow(scheduleDate)) {
        groups.tomorrow.push(schedule);
      } else if (isThisWeek(scheduleDate, { weekStartsOn: 1 }) && daysDiff > 1) {
        groups.thisWeek.push(schedule);
      } else if (daysDiff > 0) {
        groups.upcoming.push(schedule);
      } else {
        groups.past.push(schedule);
      }
    });

    return groups;
  }, [filteredSchedules]);

  // Handlers
  const handleEdit = (schedule: DetailHubSchedule) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDelete = (schedule: DetailHubSchedule) => {
    if (confirm(t('detail_hub.schedules.confirm_delete'))) {
      deleteSchedule(schedule.id);
    }
  };

  const handleDuplicate = (schedule: DetailHubSchedule) => {
    const newSchedule = {
      ...schedule,
      id: undefined,
      shift_date: format(addDays(parseISO(schedule.shift_date), 1), 'yyyy-MM-dd'),
    };
    setEditingSchedule(newSchedule as DetailHubSchedule);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {t('detail_hub.schedules.list_title')}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {filteredSchedules.length} {t('detail_hub.schedules.shifts')}
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('detail_hub.schedules.add_shift')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('detail_hub.schedules.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('detail_hub.schedules.all_statuses')}</SelectItem>
                <SelectItem value="scheduled">{t('detail_hub.schedules.status.scheduled')}</SelectItem>
                <SelectItem value="confirmed">{t('detail_hub.schedules.status.confirmed')}</SelectItem>
                <SelectItem value="in_progress">{t('detail_hub.schedules.status.in_progress')}</SelectItem>
                <SelectItem value="completed">{t('detail_hub.schedules.status.completed')}</SelectItem>
                <SelectItem value="missed">{t('detail_hub.schedules.status.missed')}</SelectItem>
                <SelectItem value="cancelled">{t('detail_hub.schedules.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={departmentFilter}
              onValueChange={(value) => setDepartmentFilter(value as DepartmentFilter)}
            >
              <SelectTrigger>
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('detail_hub.schedules.all_departments')}</SelectItem>
                <SelectItem value="detail">{t('detail_hub.employees.departments.detail')}</SelectItem>
                <SelectItem value="car_wash">{t('detail_hub.employees.departments.car_wash')}</SelectItem>
                <SelectItem value="service">{t('detail_hub.employees.departments.service')}</SelectItem>
                <SelectItem value="management">{t('detail_hub.employees.departments.management')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="card-enhanced">
          <CardContent className="py-12 text-center">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">{t('detail_hub.common.loading')}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredSchedules.length === 0 && (
        <Card className="card-enhanced">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {t('detail_hub.schedules.no_schedules')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('detail_hub.schedules.no_schedules_message')}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('detail_hub.schedules.add_first_shift')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Groups */}
      {!isLoading && (
        <>
          {/* Today */}
          {groupedSchedules.today.length > 0 && (
            <ScheduleGroup
              title={t('detail_hub.schedules.today')}
              schedules={groupedSchedules.today}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* Tomorrow */}
          {groupedSchedules.tomorrow.length > 0 && (
            <ScheduleGroup
              title={t('detail_hub.schedules.tomorrow')}
              schedules={groupedSchedules.tomorrow}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* This Week */}
          {groupedSchedules.thisWeek.length > 0 && (
            <ScheduleGroup
              title={t('detail_hub.schedules.this_week')}
              schedules={groupedSchedules.thisWeek}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* Upcoming */}
          {groupedSchedules.upcoming.length > 0 && (
            <ScheduleGroup
              title={t('detail_hub.schedules.upcoming')}
              schedules={groupedSchedules.upcoming}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* Past */}
          {groupedSchedules.past.length > 0 && (
            <ScheduleGroup
              title={t('detail_hub.schedules.past')}
              schedules={groupedSchedules.past}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isPast
            />
          )}
        </>
      )}

      {/* Shift Assignment Dialog */}
      <ShiftAssignmentDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        schedule={editingSchedule}
      />
    </div>
  );
}

// =====================================================
// SCHEDULE GROUP COMPONENT
// =====================================================

interface ScheduleGroupProps {
  title: string;
  schedules: ScheduleWithEmployee[];
  onEdit: (schedule: DetailHubSchedule) => void;
  onDelete: (schedule: DetailHubSchedule) => void;
  onDuplicate: (schedule: DetailHubSchedule) => void;
  isPast?: boolean;
}

function ScheduleGroup({
  title,
  schedules,
  onEdit,
  onDelete,
  onDuplicate,
  isPast = false
}: ScheduleGroupProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn("card-enhanced", isPast && "opacity-60")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          {title}
          <Badge variant="outline" className="ml-2">
            {schedules.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedules
          .sort((a, b) => {
            // Sort by date, then by start time
            const dateCompare = a.shift_date.localeCompare(b.shift_date);
            if (dateCompare !== 0) return dateCompare;
            return a.shift_start_time.localeCompare(b.shift_start_time);
          })
          .map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
      </CardContent>
    </Card>
  );
}

// =====================================================
// SCHEDULE CARD COMPONENT
// =====================================================

interface ScheduleCardProps {
  schedule: ScheduleWithEmployee;
  onEdit: (schedule: DetailHubSchedule) => void;
  onDelete: (schedule: DetailHubSchedule) => void;
  onDuplicate: (schedule: DetailHubSchedule) => void;
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onDuplicate,
}: ScheduleCardProps) {
  const { t } = useTranslation();
  const statusConfig = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusConfig.icon;

  const shiftDuration = useMemo(() => {
    const [startH, startM] = schedule.shift_start_time.split(':').map(Number);
    const [endH, endM] = schedule.shift_end_time.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, total: totalMinutes };
  }, [schedule.shift_start_time, schedule.shift_end_time]);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Employee Avatar */}
      <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
        <AvatarImage src={schedule.employee_photo} />
        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
          {schedule.employee_name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>

      {/* Schedule Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {schedule.employee_name}
          </p>
          <Badge variant="outline" className="text-xs capitalize">
            {schedule.employee_department.replace('_', ' ')}
          </Badge>
          <Badge className={cn("text-xs", statusConfig.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          {/* Date (if not today) */}
          {!isToday(parseISO(schedule.shift_date)) && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {format(parseISO(schedule.shift_date), 'MMM dd')}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {schedule.shift_start_time.slice(0, 5)} - {schedule.shift_end_time.slice(0, 5)}
            <span className="text-gray-400">
              ({shiftDuration.hours}h {shiftDuration.minutes > 0 && `${shiftDuration.minutes}m`})
            </span>
          </div>

          {/* Kiosk */}
          {schedule.kiosk_name && (
            <div className="flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {schedule.kiosk_name}
            </div>
          )}

          {/* Break */}
          {schedule.required_break_minutes > 0 && (
            <div className="flex items-center gap-1">
              <Coffee className="w-3 h-3" />
              {schedule.required_break_minutes}m {schedule.break_is_paid && '(paid)'}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(schedule)}>
            <Edit className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(schedule)}>
            <Copy className="w-4 h-4 mr-2" />
            {t('detail_hub.schedules.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(schedule)}
            className="text-red-600 focus:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ScheduleList;
