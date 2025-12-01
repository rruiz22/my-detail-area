import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, X } from "lucide-react";
import { useAddBreak, TimeEntryWithEmployee } from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";

interface AddBreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry: TimeEntryWithEmployee | null;
}

export function AddBreakDialog({
  open,
  onOpenChange,
  timeEntry
}: AddBreakDialogProps) {
  const { t } = useTranslation();
  const { mutateAsync: addBreak, isPending } = useAddBreak();

  // Form state
  const [breakStartTime, setBreakStartTime] = useState<string>("");
  const [breakEndTime, setBreakEndTime] = useState<string>("");
  const [breakType, setBreakType] = useState<string>("regular");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setBreakStartTime("");
      setBreakEndTime("");
      setBreakType("regular");
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!breakStartTime) {
      newErrors.breakStart = t('detail_hub.timecard.add_break.errors.start_required');
    }

    // Validate break end is after break start (if provided)
    if (breakStartTime && breakEndTime) {
      const entryDate = timeEntry ? new Date(timeEntry.clock_in).toISOString().split('T')[0] : format(new Date(), 'yyyy-MM-dd');
      const breakStartDateTime = new Date(`${entryDate}T${breakStartTime}`);
      const breakEndDateTime = new Date(`${entryDate}T${breakEndTime}`);

      if (breakEndDateTime <= breakStartDateTime) {
        newErrors.breakEnd = t('detail_hub.timecard.add_break.errors.end_after_start');
      }

      // Check 30 minute minimum for lunch breaks
      if (breakType === 'lunch') {
        const breakMinutes = (breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
        if (breakMinutes < 30) {
          newErrors.breakEnd = t('detail_hub.timecard.add_break.errors.lunch_minimum_30');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!timeEntry || !validate()) return;

    // Build ISO timestamps using entry date
    const entryDate = new Date(timeEntry.clock_in).toISOString().split('T')[0];
    const breakStartISO = new Date(`${entryDate}T${breakStartTime}`).toISOString();
    const breakEndISO = breakEndTime ? new Date(`${entryDate}T${breakEndTime}`).toISOString() : undefined;

    try {
      await addBreak({
        timeEntryId: timeEntry.id,
        employeeId: timeEntry.employee_id,
        dealershipId: timeEntry.dealership_id,
        breakStart: breakStartISO,
        breakEnd: breakEndISO,
        breakType: breakType
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Failed to add break:', error);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  if (!timeEntry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.timecard.add_break.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {timeEntry.employee_name} - {format(new Date(timeEntry.clock_in), 'MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Break Type */}
          <div className="space-y-2">
            <Label htmlFor="breakType">{t('detail_hub.timecard.add_break.break_type')}</Label>
            <Select value={breakType} onValueChange={setBreakType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch">{t('detail_hub.timecard.add_break.type_lunch')}</SelectItem>
                <SelectItem value="regular">{t('detail_hub.timecard.add_break.type_regular')}</SelectItem>
                <SelectItem value="personal">{t('detail_hub.timecard.add_break.type_personal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Break Start Time */}
          <div className="space-y-2">
            <Label htmlFor="breakStart">{t('detail_hub.timecard.add_break.break_start')}</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="breakStart"
                type="time"
                value={breakStartTime}
                onChange={(e) => setBreakStartTime(e.target.value)}
                className={`pl-10 ${errors.breakStart ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.breakStart && <p className="text-sm text-red-500">{errors.breakStart}</p>}
          </div>

          {/* Break End Time */}
          <div className="space-y-2">
            <Label htmlFor="breakEnd">{t('detail_hub.timecard.add_break.break_end')}</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="breakEnd"
                type="time"
                value={breakEndTime}
                onChange={(e) => setBreakEndTime(e.target.value)}
                className={`pl-10 ${errors.breakEnd ? 'border-red-500' : ''}`}
                disabled={!breakStartTime}
              />
            </div>
            {errors.breakEnd && <p className="text-sm text-red-500">{errors.breakEnd}</p>}
            {!breakEndTime && (
              <p className="text-xs text-muted-foreground">
                {t('detail_hub.timecard.add_break.leave_empty_for_active')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            <X className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.add_break.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Plus className="w-4 h-4 mr-2" />
            {isPending ? t('detail_hub.timecard.add_break.adding') : t('detail_hub.timecard.add_break.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
