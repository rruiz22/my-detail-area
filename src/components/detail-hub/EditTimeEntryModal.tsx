import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Save, X, Coffee } from "lucide-react";
import { useUpdateTimeEntry, TimeEntryWithEmployee, useEmployeeBreaks, DetailHubBreak } from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";

interface EditTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry: TimeEntryWithEmployee | null;
}

export function EditTimeEntryModal({
  open,
  onOpenChange,
  timeEntry
}: EditTimeEntryModalProps) {
  const { t } = useTranslation();
  const { mutateAsync: updateEntry, isPending } = useUpdateTimeEntry();

  // Fetch all breaks for this time entry
  const { data: breaks = [] } = useEmployeeBreaks(timeEntry?.id || null);

  // Form state
  const [clockInTime, setClockInTime] = useState<string>("");
  const [clockOutTime, setClockOutTime] = useState<string>("");
  const [breakStart, setBreakStart] = useState<string>("");
  const [breakEnd, setBreakEnd] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load time entry data when modal opens
  useEffect(() => {
    if (timeEntry && open) {
      const formatTimeOnly = (isoString: string | null) => {
        if (!isoString) return "";
        return format(new Date(isoString), 'HH:mm');
      };

      setClockInTime(formatTimeOnly(timeEntry.clock_in));
      setClockOutTime(formatTimeOnly(timeEntry.clock_out));
      setBreakStart(formatTimeOnly(timeEntry.break_start));
      setBreakEnd(formatTimeOnly(timeEntry.break_end));
      setNotes(timeEntry.notes || "");
      setErrors({});
    }
  }, [timeEntry, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clockInTime) {
      newErrors.clockIn = t('detail_hub.timecard.edit_entry.errors.clock_in_required');
    }

    // Validate clock out is after clock in
    if (clockInTime && clockOutTime) {
      const date = timeEntry ? new Date(timeEntry.clock_in).toISOString().split('T')[0] : format(new Date(), 'yyyy-MM-dd');
      const clockInDateTime = new Date(`${date}T${clockInTime}`);
      const clockOutDateTime = new Date(`${date}T${clockOutTime}`);

      if (clockOutDateTime <= clockInDateTime) {
        newErrors.clockOut = t('detail_hub.timecard.edit_entry.errors.clock_out_after_in');
      }
    }

    // Validate break times
    if (breakStart && breakEnd) {
      const date = timeEntry ? new Date(timeEntry.clock_in).toISOString().split('T')[0] : format(new Date(), 'yyyy-MM-dd');
      const breakStartDateTime = new Date(`${date}T${breakStart}`);
      const breakEndDateTime = new Date(`${date}T${breakEnd}`);

      if (breakEndDateTime <= breakStartDateTime) {
        newErrors.breakEnd = t('detail_hub.timecard.edit_entry.errors.break_end_after_start');
      }

      // Check 30 minute minimum
      const breakMinutes = (breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
      if (breakMinutes < 30) {
        newErrors.breakEnd = t('detail_hub.timecard.edit_entry.errors.break_minimum_30');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!timeEntry || !validate()) return;

    // Build ISO timestamps using original date
    const date = new Date(timeEntry.clock_in).toISOString().split('T')[0];
    const clockInISO = new Date(`${date}T${clockInTime}`).toISOString();
    const clockOutISO = clockOutTime ? new Date(`${date}T${clockOutTime}`).toISOString() : undefined;
    const breakStartISO = breakStart ? new Date(`${date}T${breakStart}`).toISOString() : undefined;
    const breakEndISO = breakEnd ? new Date(`${date}T${breakEnd}`).toISOString() : undefined;

    try {
      await updateEntry({
        timeEntryId: timeEntry.id,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        breakStart: breakStartISO,
        breakEnd: breakEndISO,
        notes: notes || undefined
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Failed to update entry:', error);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  if (!timeEntry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.timecard.edit_entry.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {timeEntry.employee_name} - {format(new Date(timeEntry.clock_in), 'MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Clock In */}
            <div className="space-y-2">
              <Label htmlFor="clockIn">{t('detail_hub.timecard.edit_entry.clock_in')}</Label>
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
              <Label htmlFor="clockOut">{t('detail_hub.timecard.edit_entry.clock_out')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="clockOut"
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  className={`pl-10 ${errors.clockOut ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.clockOut && <p className="text-sm text-red-500">{errors.clockOut}</p>}
            </div>
          </div>

          {/* Legacy Break Times - Single Break (Deprecated) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Break Time (Legacy)</Label>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Deprecated - Use breaks list below
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 opacity-60">
              {/* Break Start */}
              <div className="space-y-2">
                <Label htmlFor="breakStart" className="text-xs">{t('detail_hub.timecard.edit_entry.break_start')}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="breakStart"
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className={`pl-10 ${errors.breakStart ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.breakStart && <p className="text-sm text-red-500">{errors.breakStart}</p>}
              </div>

              {/* Break End */}
              <div className="space-y-2">
                <Label htmlFor="breakEnd" className="text-xs">{t('detail_hub.timecard.edit_entry.break_end')}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="breakEnd"
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className={`pl-10 ${errors.breakEnd ? 'border-red-500' : ''}`}
                    disabled={!breakStart}
                  />
                </div>
                {errors.breakEnd && <p className="text-sm text-red-500">{errors.breakEnd}</p>}
              </div>
            </div>
          </div>

          {/* Multiple Breaks Section */}
          {breaks.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Breaks Taken</Label>
                <Badge variant="secondary" className="text-xs">{breaks.length}</Badge>
              </div>
              <div className="space-y-2">
                {breaks.map((breakRecord) => (
                  <div
                    key={breakRecord.id}
                    className="grid grid-cols-4 gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <Label className="text-xs text-muted-foreground">Break #{breakRecord.break_number}</Label>
                      <Badge variant={breakRecord.break_type === 'lunch' ? 'default' : 'outline'} className="text-xs mt-1">
                        {breakRecord.break_type === 'lunch' ? 'Lunch' : 'Regular'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Start</Label>
                      <p className="text-sm font-medium mt-1">
                        {format(new Date(breakRecord.break_start), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <p className="text-sm font-medium mt-1">
                        {breakRecord.break_end
                          ? format(new Date(breakRecord.break_end), 'HH:mm')
                          : <span className="text-amber-600">Active</span>
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="text-sm font-medium mt-1">
                        {breakRecord.duration_minutes
                          ? `${breakRecord.duration_minutes} min`
                          : <span className="text-muted-foreground">-</span>
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ℹ️ Individual break editing coming soon. For now, use legacy fields above.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('detail_hub.timecard.edit_entry.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('detail_hub.timecard.edit_entry.notes_placeholder')}
              rows={3}
            />
          </div>

          {/* Warning about audit trail */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              {t('detail_hub.timecard.edit_entry.audit_warning')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            <X className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.edit_entry.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? t('detail_hub.timecard.edit_entry.saving') : t('detail_hub.timecard.edit_entry.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
