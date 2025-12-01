import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Save, X } from "lucide-react";
import { format } from "date-fns";
import { useCreateManualTimeEntry, useAddBreak, DetailHubEmployee } from "@/hooks/useDetailHubDatabase";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

interface ManualTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: DetailHubEmployee[];
}

export function ManualTimeEntryModal({ open, onOpenChange, employees }: ManualTimeEntryModalProps) {
  const { t } = useTranslation();
  const { selectedDealerId } = useDealerFilter();
  const { mutateAsync: createEntry, isPending } = useCreateManualTimeEntry();
  const { mutateAsync: addBreak } = useAddBreak();

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [clockInTime, setClockInTime] = useState<string>("");
  const [clockOutTime, setClockOutTime] = useState<string>("");
  const [breakStart, setBreakStart] = useState<string>("");
  const [breakEnd, setBreakEnd] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedEmployee) {
      newErrors.employee = t('detail_hub.timecard.manual_entry.errors.employee_required');
    }

    if (!clockInTime) {
      newErrors.clockIn = t('detail_hub.timecard.manual_entry.errors.clock_in_required');
    }

    // Validate clock out is after clock in
    if (clockInTime && clockOutTime) {
      const clockInDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${clockInTime}`);
      const clockOutDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${clockOutTime}`);

      if (clockOutDateTime <= clockInDateTime) {
        newErrors.clockOut = t('detail_hub.timecard.manual_entry.errors.clock_out_after_in');
      }
    }

    // Validate break times
    if (breakStart && !breakEnd) {
      newErrors.breakEnd = t('detail_hub.timecard.manual_entry.errors.break_end_required');
    }

    if (breakStart && breakEnd) {
      const breakStartDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${breakStart}`);
      const breakEndDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${breakEnd}`);

      if (breakEndDateTime <= breakStartDateTime) {
        newErrors.breakEnd = t('detail_hub.timecard.manual_entry.errors.break_end_after_start');
      }

      // Check 30 minute minimum
      const breakMinutes = (breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
      if (breakMinutes < 30) {
        newErrors.breakEnd = t('detail_hub.timecard.manual_entry.errors.break_minimum_30');
      }

      // Check break is within clock in/out times
      if (clockInTime) {
        const clockInDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${clockInTime}`);
        if (breakStartDateTime < clockInDateTime) {
          newErrors.breakStart = t('detail_hub.timecard.manual_entry.errors.break_within_shift');
        }
      }

      if (clockOutTime) {
        const clockOutDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${clockOutTime}`);
        if (breakEndDateTime > clockOutDateTime) {
          newErrors.breakEnd = t('detail_hub.timecard.manual_entry.errors.break_within_shift');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const dealershipId = selectedDealerId === 'all' ? 0 : selectedDealerId;
    if (dealershipId === 0) {
      setErrors({ general: 'Please select a specific dealership' });
      return;
    }

    // Build ISO timestamps
    const dateString = format(date, 'yyyy-MM-dd');
    const clockInISO = new Date(`${dateString}T${clockInTime}`).toISOString();
    const clockOutISO = clockOutTime ? new Date(`${dateString}T${clockOutTime}`).toISOString() : undefined;
    const breakStartISO = breakStart ? new Date(`${dateString}T${breakStart}`).toISOString() : undefined;
    const breakEndISO = breakEnd ? new Date(`${dateString}T${breakEnd}`).toISOString() : undefined;

    try {
      // Create time entry first (without breaks)
      const newEntry = await createEntry({
        employeeId: selectedEmployee,
        dealershipId: dealershipId as number,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        notes: notes || undefined
      });

      // If break data provided, create break in detail_hub_breaks table
      if (breakStartISO && breakEndISO) {
        await addBreak({
          timeEntryId: newEntry.id,
          employeeId: selectedEmployee,
          dealershipId: dealershipId as number,
          breakStart: breakStartISO,
          breakEnd: breakEndISO,
          breakType: 'lunch' // Default to lunch for manual entries
        });
      }

      // Reset form and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Failed to create manual entry:', error);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setDate(new Date());
    setClockInTime("");
    setClockOutTime("");
    setBreakStart("");
    setBreakEnd("");
    setNotes("");
    setErrors({});
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Filter active employees
  const activeEmployees = employees.filter(emp => emp.status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.timecard.manual_entry.title')}</DialogTitle>
          <DialogDescription>
            {t('detail_hub.timecard.manual_entry.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">{t('detail_hub.timecard.manual_entry.employee')}</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger id="employee" className={errors.employee ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('detail_hub.timecard.manual_entry.select_employee')} />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee && <p className="text-sm text-red-500">{errors.employee}</p>}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>{t('detail_hub.timecard.manual_entry.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Clock In */}
            <div className="space-y-2">
              <Label htmlFor="clockIn">{t('detail_hub.timecard.manual_entry.clock_in')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="clockIn"
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className={`pl-10 ${errors.clockIn ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.clockIn && <p className="text-sm text-red-500">{errors.clockIn}</p>}
            </div>

            {/* Clock Out */}
            <div className="space-y-2">
              <Label htmlFor="clockOut">{t('detail_hub.timecard.manual_entry.clock_out')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="clockOut"
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  className={`pl-10 ${errors.clockOut ? 'border-red-500' : ''}`}
                  placeholder={t('detail_hub.timecard.manual_entry.optional')}
                />
              </div>
              {errors.clockOut && <p className="text-sm text-red-500">{errors.clockOut}</p>}
            </div>
          </div>

          {/* Break Times */}
          <div className="grid grid-cols-2 gap-4">
            {/* Break Start */}
            <div className="space-y-2">
              <Label htmlFor="breakStart">{t('detail_hub.timecard.manual_entry.break_start')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="breakStart"
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className={`pl-10 ${errors.breakStart ? 'border-red-500' : ''}`}
                  placeholder={t('detail_hub.timecard.manual_entry.optional')}
                />
              </div>
              {errors.breakStart && <p className="text-sm text-red-500">{errors.breakStart}</p>}
            </div>

            {/* Break End */}
            <div className="space-y-2">
              <Label htmlFor="breakEnd">{t('detail_hub.timecard.manual_entry.break_end')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="breakEnd"
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className={`pl-10 ${errors.breakEnd ? 'border-red-500' : ''}`}
                  placeholder={t('detail_hub.timecard.manual_entry.optional')}
                  disabled={!breakStart}
                />
              </div>
              {errors.breakEnd && <p className="text-sm text-red-500">{errors.breakEnd}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('detail_hub.timecard.manual_entry.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('detail_hub.timecard.manual_entry.notes_placeholder')}
              rows={3}
            />
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            <X className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.manual_entry.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? t('detail_hub.timecard.manual_entry.saving') : t('detail_hub.timecard.manual_entry.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
