/**
 * ShiftAssignmentDialog Component
 *
 * Modal for creating and editing employee shift schedules
 *
 * Features:
 * - Employee selection (searchable)
 * - Date and time pickers
 * - Kiosk assignment
 * - Break duration configuration
 * - Early punch window
 * - Shift conflict detection
 * - Form validation
 * - Responsive layout
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Monitor,
  Coffee,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Trash2,
  Save
} from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  type DetailHubSchedule,
  detectScheduleConflict,
} from "@/hooks/useDetailHubSchedules";
import { useDetailHubEmployees } from "@/hooks/useDetailHubDatabase";
import { useDetailHubKiosks } from "@/hooks/useDetailHubKiosks";

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const scheduleFormSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  shift_date: z.date({ required_error: "Date is required" }),
  shift_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  shift_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  assigned_kiosk_id: z.string().nullable().optional(),
  required_break_minutes: z.coerce.number().min(0).max(120).default(30),
  early_punch_allowed_minutes: z.coerce.number().min(0).max(30).default(5),
  late_punch_grace_minutes: z.coerce.number().min(0).max(30).default(5),
  break_is_paid: z.boolean().default(false),
  notes: z.string().nullable().optional(),
}).refine((data) => {
  // Validate end time is after start time
  const start = parse(data.shift_start_time, 'HH:mm', new Date());
  const end = parse(data.shift_end_time, 'HH:mm', new Date());
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["shift_end_time"],
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

// =====================================================
// COMPONENT PROPS
// =====================================================

interface ShiftAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: DetailHubSchedule | null;
  defaultDate?: Date;
  defaultTime?: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ShiftAssignmentDialog({
  open,
  onOpenChange,
  schedule,
  defaultDate,
  defaultTime,
}: ShiftAssignmentDialogProps) {
  const { t } = useTranslation();
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Fetch data
  const { data: employees = [] } = useDetailHubEmployees();
  const { data: kiosks = [] } = useDetailHubKiosks();

  // Mutations
  const { mutate: createSchedule, isPending: isCreating } = useCreateSchedule();
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateSchedule();
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule();

  // Form setup
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      employee_id: "",
      shift_date: defaultDate || new Date(),
      shift_start_time: defaultTime || "08:00",
      shift_end_time: defaultTime ? addHours(defaultTime, 8) : "17:00",
      assigned_kiosk_id: null,
      required_break_minutes: 30,
      early_punch_allowed_minutes: 5,
      late_punch_grace_minutes: 5,
      break_is_paid: false,
      notes: null,
    },
  });

  // Load schedule data when editing
  useEffect(() => {
    if (schedule) {
      form.reset({
        employee_id: schedule.employee_id,
        shift_date: new Date(schedule.shift_date),
        shift_start_time: schedule.shift_start_time.slice(0, 5),
        shift_end_time: schedule.shift_end_time.slice(0, 5),
        assigned_kiosk_id: schedule.assigned_kiosk_id,
        required_break_minutes: schedule.required_break_minutes,
        early_punch_allowed_minutes: schedule.early_punch_allowed_minutes,
        late_punch_grace_minutes: schedule.late_punch_grace_minutes,
        break_is_paid: schedule.break_is_paid,
        notes: schedule.notes,
      });
    } else if (defaultDate || defaultTime) {
      form.reset({
        employee_id: "",
        shift_date: defaultDate || new Date(),
        shift_start_time: defaultTime || "08:00",
        shift_end_time: defaultTime ? addHours(defaultTime, 8) : "17:00",
        assigned_kiosk_id: null,
        required_break_minutes: 30,
        early_punch_allowed_minutes: 5,
        late_punch_grace_minutes: 5,
        break_is_paid: false,
        notes: null,
      });
    }
  }, [schedule, defaultDate, defaultTime, form]);

  // Helper: Add hours to time string
  function addHours(timeStr: string, hours: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const newHour = (h + hours) % 24;
    return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Check for schedule conflicts
  const checkConflict = async (values: ScheduleFormValues) => {
    setIsCheckingConflict(true);
    setConflictError(null);

    try {
      const hasConflict = await detectScheduleConflict(
        values.employee_id,
        format(values.shift_date, 'yyyy-MM-dd'),
        values.shift_start_time,
        values.shift_end_time,
        schedule?.id
      );

      if (hasConflict) {
        setConflictError(t('detail_hub.schedules.conflict_detected'));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking conflict:', error);
      return false;
    } finally {
      setIsCheckingConflict(false);
    }
  };

  // Form submission
  const onSubmit = async (values: ScheduleFormValues) => {
    // Check conflicts before saving
    const hasConflict = await checkConflict(values);
    if (hasConflict) return;

    const scheduleData = {
      employee_id: values.employee_id,
      shift_date: format(values.shift_date, 'yyyy-MM-dd'),
      shift_start_time: values.shift_start_time + ':00',
      shift_end_time: values.shift_end_time + ':00',
      assigned_kiosk_id: values.assigned_kiosk_id || null,
      required_break_minutes: values.required_break_minutes,
      early_punch_allowed_minutes: values.early_punch_allowed_minutes,
      late_punch_grace_minutes: values.late_punch_grace_minutes,
      break_is_paid: values.break_is_paid,
      notes: values.notes || null,
      status: 'scheduled' as const,
    };

    if (schedule) {
      // Update existing
      updateSchedule(
        { id: schedule.id, updates: scheduleData },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      // Create new
      createSchedule(scheduleData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  // Delete handler
  const handleDelete = () => {
    if (!schedule) return;

    if (confirm(t('detail_hub.schedules.confirm_delete'))) {
      deleteSchedule(schedule.id, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  // Get employee by ID
  const selectedEmployee = employees.find(e => e.id === form.watch('employee_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              {schedule
                ? t('detail_hub.schedules.edit_shift')
                : t('detail_hub.schedules.add_shift')}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {/* Employee Selection */}
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t('detail_hub.schedules.employee')}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={employeeSearchOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {selectedEmployee?.employee_number}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {selectedEmployee?.department.replace('_', ' ')}
                                </Badge>
                              </div>
                            ) : (
                              t('detail_hub.schedules.select_employee')
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t('detail_hub.schedules.search_employee')}
                          />
                          <CommandEmpty>
                            {t('detail_hub.schedules.no_employee_found')}
                          </CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {employees
                              .filter(e => e.status === 'active')
                              .map((employee) => (
                                <CommandItem
                                  key={employee.id}
                                  value={`${employee.first_name} ${employee.last_name} ${employee.employee_number}`}
                                  onSelect={() => {
                                    form.setValue('employee_id', employee.id);
                                    setEmployeeSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === employee.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {employee.first_name} {employee.last_name}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{employee.employee_number}</span>
                                      <span>•</span>
                                      <span className="capitalize">
                                        {employee.department.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="shift_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('detail_hub.schedules.date')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM dd, yyyy")
                              ) : (
                                <span>{t('detail_hub.schedules.pick_date')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shift_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('detail_hub.schedules.start_time')}</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shift_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('detail_hub.schedules.end_time')}</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Kiosk Assignment */}
              <FormField
                control={form.control}
                name="assigned_kiosk_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      {t('detail_hub.schedules.assigned_kiosk')}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('detail_hub.schedules.select_kiosk')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {t('detail_hub.schedules.no_kiosk')}
                        </SelectItem>
                        {kiosks
                          .filter(k => k.status === 'online')
                          .map((kiosk) => (
                            <SelectItem key={kiosk.id} value={kiosk.id}>
                              <div className="flex items-center gap-2">
                                <span>{kiosk.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {kiosk.kiosk_code}
                                </Badge>
                                {kiosk.location && (
                                  <span className="text-xs text-muted-foreground">
                                    • {kiosk.location}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {t('detail_hub.schedules.kiosk_help')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Break Settings */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="required_break_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        {t('detail_hub.schedules.break_duration')}
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="120"
                            step="5"
                            {...field}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('detail_hub.schedules.minutes')}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="break_is_paid"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel className="text-xs opacity-0">Spacer</FormLabel>
                      <div className="flex items-center gap-2 h-10">
                        <input
                          type="checkbox"
                          id="break_is_paid"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label htmlFor="break_is_paid" className="font-normal cursor-pointer">
                          {t('detail_hub.schedules.paid_break')}
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Punch Window Settings */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="early_punch_allowed_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('detail_hub.schedules.early_punch_window')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            step="5"
                            {...field}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('detail_hub.schedules.minutes')}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('detail_hub.schedules.early_punch_help')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="late_punch_grace_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('detail_hub.schedules.late_punch_grace')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            step="5"
                            {...field}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('detail_hub.schedules.minutes')}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('detail_hub.schedules.late_punch_help')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('detail_hub.schedules.notes')}</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        value={field.value || ''}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder={t('detail_hub.schedules.notes_placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conflict Warning */}
              {conflictError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">{conflictError}</p>
                    <p className="text-xs text-red-700 mt-1">
                      {t('detail_hub.schedules.conflict_message')}
                    </p>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between w-full">
            <div>
              {schedule && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? t('common.deleting') : t('common.delete')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating || isUpdating || isDeleting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isCreating || isUpdating || isDeleting || isCheckingConflict}
              >
                {(isCreating || isUpdating) && (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                )}
                {!isCreating && !isUpdating && <Save className="w-4 h-4 mr-2" />}
                {schedule ? t('common.save') : t('detail_hub.schedules.add_shift')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShiftAssignmentDialog;
