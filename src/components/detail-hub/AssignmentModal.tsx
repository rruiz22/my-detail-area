/**
 * Assignment Modal
 *
 * Create or edit employee-dealership assignments with schedule templates.
 * Allows assigning employees to multiple dealerships with different work schedules.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Clock, AlertCircle } from "lucide-react";
import { useCreateAssignment, useUpdateAssignment, type EmployeeAssignment, type ScheduleTemplate } from "@/hooks/useEmployeeAssignments";
import { useDealerships } from "@/hooks/useDealerships";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface AssignmentModalProps {
  /** Existing assignment to edit (null for create mode) */
  assignment: EmployeeAssignment | null;

  /** Employee ID for new assignments */
  employeeId: string;

  /** Employee name (for display) */
  employeeName?: string;

  /** Employee's default schedule template (inherited by new assignments) */
  employeeScheduleTemplate?: Partial<ScheduleTemplate>;

  /** Whether the modal is open */
  open: boolean;

  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal for creating or editing employee-dealership assignments
 * Includes schedule template configuration
 */
export function AssignmentModal({
  assignment,
  employeeId,
  employeeName,
  employeeScheduleTemplate,
  open,
  onClose
}: AssignmentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mutate: createAssignment, isPending: creating } = useCreateAssignment();
  const { mutate: updateAssignment, isPending: updating } = useUpdateAssignment();
  const { data: dealerships } = useDealerships();

  // Form state
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [scheduleTemplate, setScheduleTemplate] = useState<ScheduleTemplate>({
    shift_start_time: '08:00',
    shift_end_time: '17:00',
    days_of_week: [0, 1, 2, 3, 4, 5, 6], // All days (flexible)
    early_punch_allowed_minutes: undefined, // undefined = no time restriction (flexible)
    late_punch_grace_minutes: undefined,    // undefined = no time restriction (flexible)
    required_break_minutes: 30,
    break_is_paid: false
  });
  const [notes, setNotes] = useState('');

  // Initialize form with existing assignment data (edit mode)
  useEffect(() => {
    if (assignment) {
      setSelectedDealerId(assignment.dealership_id);
      setScheduleTemplate({
        // AUTO-SYNC: Always inherit from employee's current schedule (not old assignment values)
        shift_start_time: employeeScheduleTemplate?.shift_start_time || assignment.schedule_template.shift_start_time || '08:00',
        shift_end_time: employeeScheduleTemplate?.shift_end_time || assignment.schedule_template.shift_end_time || '17:00',
        days_of_week: employeeScheduleTemplate?.days_of_week || assignment.schedule_template.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        // Always sync time restrictions from employee (NULL = flexible)
        early_punch_allowed_minutes: employeeScheduleTemplate?.early_punch_allowed_minutes,
        late_punch_grace_minutes: employeeScheduleTemplate?.late_punch_grace_minutes,
        required_break_minutes: employeeScheduleTemplate?.required_break_minutes ?? assignment.schedule_template.required_break_minutes ?? 30,
        break_is_paid: employeeScheduleTemplate?.break_is_paid ?? assignment.schedule_template.break_is_paid ?? false
      });
      setNotes(assignment.notes || '');
    } else {
      // Reset form for create mode
      // Inherit from employee's default schedule template if available
      setSelectedDealerId(null);
      setScheduleTemplate({
        shift_start_time: employeeScheduleTemplate?.shift_start_time || '08:00',
        shift_end_time: employeeScheduleTemplate?.shift_end_time || '17:00',
        days_of_week: employeeScheduleTemplate?.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        // Inherit employee's time restrictions (or undefined = flexible if not set)
        early_punch_allowed_minutes: employeeScheduleTemplate?.early_punch_allowed_minutes,
        late_punch_grace_minutes: employeeScheduleTemplate?.late_punch_grace_minutes,
        required_break_minutes: employeeScheduleTemplate?.required_break_minutes ?? 30,
        break_is_paid: employeeScheduleTemplate?.break_is_paid ?? false
      });
      setNotes('');
    }
  }, [assignment, employeeScheduleTemplate]);

  const handleSubmit = () => {
    // Validate time range before submission
    if (scheduleTemplate.shift_start_time && scheduleTemplate.shift_end_time) {
      const start = new Date(`1970-01-01T${scheduleTemplate.shift_start_time}`);
      const end = new Date(`1970-01-01T${scheduleTemplate.shift_end_time}`);

      if (end <= start) {
        toast({
          title: t('validation.invalid_time_range'),
          description: t('validation.shift_end_must_be_after_start'),
          variant: "destructive"
        });
        return;
      }
    }

    if (assignment) {
      // Edit existing assignment
      updateAssignment(
        {
          assignmentId: assignment.id,
          updates: {
            schedule_template: scheduleTemplate,
            notes: notes || undefined
          }
        },
        {
          onSuccess: () => {
            onClose();
          }
        }
      );
    } else {
      // Create new assignment
      if (!selectedDealerId) {
        toast({
          title: t('validation.dealershipRequired'),
          variant: "destructive"
        });
        return;
      }

      createAssignment(
        {
          employee_id: employeeId,
          dealership_id: selectedDealerId,
          schedule_template: scheduleTemplate,
          auto_generate_schedules: false,
          notes: notes || undefined
        },
        {
          onSuccess: () => {
            onClose();
          }
        }
      );
    }
  };

  const isSubmitting = creating || updating;
  const isEditMode = !!assignment;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? 'Edit Assignment' : 'Assign to Dealership'}
            {employeeName && <span className="text-gray-500">- {employeeName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dealership Selection */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="dealership">Dealership *</Label>
              <Select
                value={selectedDealerId?.toString() || ''}
                onValueChange={(value) => setSelectedDealerId(parseInt(value))}
              >
                <SelectTrigger id="dealership">
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
                  {dealerships?.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id.toString()}>
                      <div className="flex items-center gap-2">
                        {dealer.logo_url && (
                          <img src={dealer.logo_url} alt="" className="h-4 w-4 object-contain" />
                        )}
                        {dealer.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Employee can work at multiple dealerships with different schedules
              </p>
            </div>
          )}

          {/* Schedule Template Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Schedule Template
            </div>

            {/* Shift Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-start">Shift Start Time</Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={scheduleTemplate.shift_start_time}
                  onChange={(e) =>
                    setScheduleTemplate({ ...scheduleTemplate, shift_start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-end">Shift End Time</Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={scheduleTemplate.shift_end_time}
                  onChange={(e) =>
                    setScheduleTemplate({ ...scheduleTemplate, shift_end_time: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Punch Windows */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="early-minutes">Early Punch (minutes)</Label>
                <Input
                  id="early-minutes"
                  type="number"
                  min="0"
                  max="60"
                  value={scheduleTemplate.early_punch_allowed_minutes ?? ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                    setScheduleTemplate({
                      ...scheduleTemplate,
                      early_punch_allowed_minutes: value !== undefined && isNaN(value) ? undefined : value
                    });
                  }}
                />
                <p className="text-xs text-gray-500">
                  Minutes before shift start. Leave empty for no time restriction.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-minutes">Late Punch (minutes)</Label>
                <Input
                  id="late-minutes"
                  type="number"
                  min="0"
                  max="60"
                  value={scheduleTemplate.late_punch_grace_minutes ?? ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                    setScheduleTemplate({
                      ...scheduleTemplate,
                      late_punch_grace_minutes: value !== undefined && isNaN(value) ? undefined : value
                    });
                  }}
                />
                <p className="text-xs text-gray-500">
                  Minutes after shift start. Leave empty for no time restriction.
                </p>
              </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-2">
              <Label htmlFor="break-minutes">Required Break (minutes)</Label>
              <Input
                id="break-minutes"
                type="number"
                min="0"
                max="120"
                value={scheduleTemplate.required_break_minutes}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setScheduleTemplate({
                    ...scheduleTemplate,
                    required_break_minutes: isNaN(value) ? 0 : value
                  });
                }}
              />
            </div>

            {/* Flexible Work Days Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Flexible Schedule:</strong> Employee can work <strong>any day</strong> at this
                dealership. No day restrictions apply.
              </AlertDescription>
            </Alert>
          </div>

          {/* Notes */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (!isEditMode && !selectedDealerId)}>
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
