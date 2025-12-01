import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save, X } from "lucide-react";
import { useUpdateBreak, DetailHubBreak } from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";

interface BreakEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakRecord: DetailHubBreak | null;
  entryDate: string; // Original time entry date (YYYY-MM-DD)
}

export function BreakEditDialog({
  open,
  onOpenChange,
  breakRecord,
  entryDate
}: BreakEditDialogProps) {
  const { t } = useTranslation();
  const { mutateAsync: updateBreak, isPending } = useUpdateBreak();

  // Form state
  const [breakStartTime, setBreakStartTime] = useState<string>("");
  const [breakEndTime, setBreakEndTime] = useState<string>("");
  const [breakType, setBreakType] = useState<string>("regular");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load break data when modal opens
  useEffect(() => {
    if (breakRecord && open) {
      const formatTimeOnly = (isoString: string | null) => {
        if (!isoString) return "";
        return format(new Date(isoString), 'HH:mm');
      };

      setBreakStartTime(formatTimeOnly(breakRecord.break_start));
      setBreakEndTime(formatTimeOnly(breakRecord.break_end));
      setBreakType(breakRecord.break_type || "regular");
      setErrors({});
    }
  }, [breakRecord, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!breakStartTime) {
      newErrors.breakStart = t('detail_hub.timecard.break_edit.errors.start_required');
    }

    // Validate break end is after break start
    if (breakStartTime && breakEndTime) {
      const breakStartDateTime = new Date(`${entryDate}T${breakStartTime}`);
      const breakEndDateTime = new Date(`${entryDate}T${breakEndTime}`);

      if (breakEndDateTime <= breakStartDateTime) {
        newErrors.breakEnd = t('detail_hub.timecard.break_edit.errors.end_after_start');
      }

      // Check 30 minute minimum for lunch breaks
      if (breakType === 'lunch') {
        const breakMinutes = (breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
        if (breakMinutes < 30) {
          newErrors.breakEnd = t('detail_hub.timecard.break_edit.errors.lunch_minimum_30');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!breakRecord || !validate()) return;

    // Build ISO timestamps using entry date
    const breakStartISO = new Date(`${entryDate}T${breakStartTime}`).toISOString();
    const breakEndISO = breakEndTime ? new Date(`${entryDate}T${breakEndTime}`).toISOString() : undefined;

    try {
      await updateBreak({
        breakId: breakRecord.id,
        breakStart: breakStartISO,
        breakEnd: breakEndISO,
        breakType: breakType
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Failed to update break:', error);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  if (!breakRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('detail_hub.timecard.break_edit.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('detail_hub.timecard.break_edit.subtitle', { breakNumber: breakRecord.break_number })}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Break Type */}
          <div className="space-y-2">
            <Label htmlFor="breakType">{t('detail_hub.timecard.break_edit.break_type')}</Label>
            <Select value={breakType} onValueChange={setBreakType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch">{t('detail_hub.timecard.break_edit.type_lunch')}</SelectItem>
                <SelectItem value="regular">{t('detail_hub.timecard.break_edit.type_regular')}</SelectItem>
                <SelectItem value="personal">{t('detail_hub.timecard.break_edit.type_personal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Break Start Time */}
          <div className="space-y-2">
            <Label htmlFor="breakStart">{t('detail_hub.timecard.break_edit.break_start')}</Label>
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
            <Label htmlFor="breakEnd">{t('detail_hub.timecard.break_edit.break_end')}</Label>
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
                {t('detail_hub.timecard.break_edit.leave_empty_for_active')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            <X className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.break_edit.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? t('detail_hub.timecard.break_edit.saving') : t('detail_hub.timecard.break_edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
