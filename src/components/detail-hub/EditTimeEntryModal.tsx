import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Save, X, Coffee, Edit2, Trash2, PlayCircle, Plus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  useUpdateTimeEntry,
  useEndBreakById,
  useDeleteBreak,
  TimeEntryWithEmployee,
  useEmployeeBreaks,
  DetailHubBreak
} from "@/hooks/useDetailHubDatabase";
import { format } from "date-fns";
import { BreakEditDialog } from "./BreakEditDialog";
import { AddBreakDialog } from "./AddBreakDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { mutateAsync: endBreak, isPending: isEndingBreak } = useEndBreakById();
  const { mutateAsync: deleteBreak, isPending: isDeletingBreak } = useDeleteBreak();

  // Fetch all breaks for this time entry
  const { data: breaks = [] } = useEmployeeBreaks(timeEntry?.id || null);

  // Form state (only clock in/out and notes, NO LEGACY BREAKS)
  const [clockInTime, setClockInTime] = useState<string>("");
  const [clockOutTime, setClockOutTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Break editing state
  const [editingBreak, setEditingBreak] = useState<DetailHubBreak | null>(null);
  const [breakEditDialogOpen, setBreakEditDialogOpen] = useState(false);
  const [addBreakDialogOpen, setAddBreakDialogOpen] = useState(false);
  const [deletingBreakId, setDeletingBreakId] = useState<string | null>(null);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!timeEntry || !validate()) return;

    // Build ISO timestamps using original date
    const date = new Date(timeEntry.clock_in).toISOString().split('T')[0];
    const clockInISO = new Date(`${date}T${clockInTime}`).toISOString();
    const clockOutISO = clockOutTime ? new Date(`${date}T${clockOutTime}`).toISOString() : undefined;

    try {
      await updateEntry({
        timeEntryId: timeEntry.id,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        notes: notes || undefined
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Failed to update entry:', error);
    }
  };

  const handleEditBreak = (breakRecord: DetailHubBreak) => {
    setEditingBreak(breakRecord);
    setBreakEditDialogOpen(true);
  };

  const handleEndBreak = async (breakRecord: DetailHubBreak) => {
    try {
      await endBreak({ breakId: breakRecord.id });
    } catch (error) {
      console.error('Failed to end break:', error);
    }
  };

  const handleDeleteBreakConfirm = async () => {
    if (!deletingBreakId || !timeEntry) return;

    try {
      await deleteBreak({
        breakId: deletingBreakId,
        timeEntryId: timeEntry.id
      });
      setDeletingBreakId(null);
    } catch (error) {
      console.error('Failed to delete break:', error);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  if (!timeEntry) return null;

  const entryDate = new Date(timeEntry.clock_in).toISOString().split('T')[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detail_hub.timecard.edit_entry.title')}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {timeEntry.employee_name} - {format(new Date(timeEntry.clock_in), 'MMMM d, yyyy')}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* ⚠️ APPROVAL STATUS WARNING: Show if timecard is approved - EDITING DISABLED */}
            {timeEntry.approval_status === 'approved' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {t('detail_hub.timecard.edit_entry.approved_warning_title')}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('detail_hub.timecard.edit_entry.editing_disabled_approved')}
                  </p>
                </div>
              </div>
            )}

            {/* ⚠️ REJECTED WARNING: Allow editing but warn */}
            {timeEntry.approval_status === 'rejected' && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {t('detail_hub.timecard.edit_entry.rejected_warning_title')}
                  </p>
                  {timeEntry.rejection_reason && (
                    <p className="text-sm text-red-600 mt-1 italic">
                      "{timeEntry.rejection_reason}"
                    </p>
                  )}
                  <p className="text-sm text-red-700 mt-1">
                    {t('detail_hub.timecard.edit_entry.rejected_warning_description')}
                  </p>
                </div>
              </div>
            )}
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
                    disabled={timeEntry.approval_status === 'approved'}
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
                    disabled={timeEntry.approval_status === 'approved'}
                  />
                </div>
                {errors.clockOut && <p className="text-sm text-red-500">{errors.clockOut}</p>}
              </div>
            </div>

            {/* Breaks Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t('detail_hub.timecard.edit_entry.breaks_taken')}</Label>
                  <Badge variant="secondary" className="text-xs">{breaks.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddBreakDialogOpen(true)}
                  disabled={timeEntry.approval_status === 'approved'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('detail_hub.timecard.edit_entry.add_break')}
                </Button>
              </div>

              {breaks.length > 0 ? (
                <div className="space-y-2">
                  {breaks.map((breakRecord) => (
                    <div
                      key={breakRecord.id}
                      className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-3 p-3 border rounded-lg bg-gray-50 items-center"
                    >
                      {/* Break Type */}
                      <div>
                        <Badge variant={breakRecord.break_type === 'lunch' ? 'default' : 'outline'} className="text-xs">
                          {breakRecord.break_type === 'lunch' ? t('detail_hub.timecard.edit_entry.lunch') : t('detail_hub.timecard.edit_entry.break')} #{breakRecord.break_number}
                        </Badge>
                      </div>

                      {/* Start */}
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('detail_hub.timecard.edit_entry.start')}</Label>
                        <p className="text-sm font-medium mt-1">
                          {format(new Date(breakRecord.break_start), 'HH:mm')}
                        </p>
                      </div>

                      {/* End */}
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('detail_hub.timecard.edit_entry.end')}</Label>
                        <p className="text-sm font-medium mt-1">
                          {breakRecord.break_end
                            ? format(new Date(breakRecord.break_end), 'HH:mm')
                            : <span className="text-amber-600">{t('detail_hub.timecard.edit_entry.active')}</span>
                          }
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('detail_hub.timecard.edit_entry.duration')}</Label>
                        <p className="text-sm font-medium mt-1">
                          {breakRecord.duration_minutes
                            ? `${breakRecord.duration_minutes} min`
                            : <span className="text-muted-foreground">-</span>
                          }
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* End Now button (only for active breaks) */}
                        {!breakRecord.break_end && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEndBreak(breakRecord)}
                            disabled={isEndingBreak || timeEntry.approval_status === 'approved'}
                            title={t('detail_hub.timecard.edit_entry.end_now')}
                          >
                            <PlayCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}

                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBreak(breakRecord)}
                          disabled={timeEntry.approval_status === 'approved'}
                          title={t('detail_hub.timecard.edit_entry.edit_break')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingBreakId(breakRecord.id)}
                          disabled={isDeletingBreak || timeEntry.approval_status === 'approved'}
                          title={t('detail_hub.timecard.edit_entry.delete_break')}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('detail_hub.timecard.edit_entry.no_breaks')}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('detail_hub.timecard.edit_entry.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('detail_hub.timecard.edit_entry.notes_placeholder')}
                rows={3}
                disabled={timeEntry.approval_status === 'approved'}
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
            <Button
              onClick={handleSubmit}
              disabled={isPending || timeEntry.approval_status === 'approved'}
              title={timeEntry.approval_status === 'approved' ? t('detail_hub.timecard.edit_entry.editing_disabled_approved') : undefined}
            >
              <Save className="w-4 h-4 mr-2" />
              {isPending ? t('detail_hub.timecard.edit_entry.saving') : t('detail_hub.timecard.edit_entry.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break Edit Dialog */}
      <BreakEditDialog
        open={breakEditDialogOpen}
        onOpenChange={setBreakEditDialogOpen}
        breakRecord={editingBreak}
        entryDate={entryDate}
      />

      {/* Add Break Dialog */}
      <AddBreakDialog
        open={addBreakDialogOpen}
        onOpenChange={setAddBreakDialogOpen}
        timeEntry={timeEntry}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBreakId} onOpenChange={() => setDeletingBreakId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail_hub.timecard.edit_entry.delete_break_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail_hub.timecard.edit_entry.delete_break_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('detail_hub.timecard.edit_entry.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBreakConfirm}>
              {t('detail_hub.timecard.edit_entry.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
