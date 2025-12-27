/**
 * Assignment Modal
 *
 * Create or edit employee-dealership assignments with schedule templates.
 * Allows assigning employees to multiple dealerships with different work schedules.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDealerships } from "@/hooks/useDealerships";
import { useCreateAssignment, useUpdateAssignment, type EmployeeAssignment, type ScheduleTemplate } from "@/hooks/useEmployeeAssignments";
import { AlertCircle, Bell, Building2, Calendar, Clock, Coffee } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AssignmentModalProps {
  /** Existing assignment to edit (null for create mode) */
  assignment: EmployeeAssignment | null;

  /** Employee ID for new assignments */
  employeeId: string;

  /** Employee name (for display) */
  employeeName?: string;


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
    shift_end_time: '18:00', // 8am - 6pm default
    days_of_week: [1, 2, 3, 4, 5, 6], // Monday-Saturday
    early_punch_allowed_minutes: 5, // Can punch in 5 min early
    late_punch_grace_minutes: undefined, // No late limit (flexible)
    required_break_minutes: 30,
    break_is_paid: false,
    require_face_validation: false
  });
  const [notes, setNotes] = useState('');

  // Initialize form with existing assignment data (edit mode) or system defaults (create mode)
  useEffect(() => {
    if (assignment) {
      // EDIT MODE: Load from existing assignment
      setSelectedDealerId(assignment.dealership_id);
      setScheduleTemplate({
        shift_start_time: assignment.schedule_template.shift_start_time || '08:00',
        shift_end_time: assignment.schedule_template.shift_end_time || '18:00',
        days_of_week: assignment.schedule_template.days_of_week || [1, 2, 3, 4, 5, 6],
        early_punch_allowed_minutes: assignment.schedule_template.early_punch_allowed_minutes,
        late_punch_grace_minutes: assignment.schedule_template.late_punch_grace_minutes,
        required_break_minutes: assignment.schedule_template.required_break_minutes ?? 30,
        break_is_paid: assignment.schedule_template.break_is_paid ?? false,
        require_face_validation: assignment.schedule_template.require_face_validation ?? false,
        // Auto-close configuration
        auto_close_enabled: assignment.schedule_template.auto_close_enabled ?? false,
        auto_close_first_reminder: assignment.schedule_template.auto_close_first_reminder ?? 30,
        auto_close_second_reminder: assignment.schedule_template.auto_close_second_reminder, // No second reminder
        auto_close_window_minutes: assignment.schedule_template.auto_close_window_minutes ?? 60
      });
      setNotes(assignment.notes || '');
    } else {
      // CREATE MODE: Use system defaults (Mon-Sat, 8AM-6PM)
      setSelectedDealerId(null);
      setScheduleTemplate({
        shift_start_time: '08:00',
        shift_end_time: '18:00',
        days_of_week: [1, 2, 3, 4, 5, 6], // Monday-Saturday (no Sunday)
        early_punch_allowed_minutes: 5, // Can punch in 5 min early
        late_punch_grace_minutes: undefined, // No late limit (flexible)
        required_break_minutes: 30,
        break_is_paid: false,
        require_face_validation: false,
        // Auto-close defaults (disabled by default)
        auto_close_enabled: false,
        auto_close_first_reminder: 30, // Single reminder at 30 min after shift end
        auto_close_second_reminder: undefined, // No second reminder
        auto_close_window_minutes: 60 // Auto-close at 60 min after shift end
      });
      setNotes('');
    }
  }, [assignment]);

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
    <Dialog
      key={assignment?.id || 'new'}
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-emerald-600" />
            {isEditMode ? 'Edit Assignment' : 'Assign to Dealership'}
            {employeeName && <span className="text-gray-400 font-normal">· {employeeName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-5">
          {/* Dealership Selection */}
          {!isEditMode && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Dealership Assignment
                </CardTitle>
                <CardDescription>
                  Select which dealership this employee will work at
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="dealership">Dealership *</Label>
                  <Select
                    value={selectedDealerId?.toString() || ''}
                    onValueChange={(value) => setSelectedDealerId(parseInt(value))}
                  >
                    <SelectTrigger id="dealership" className="bg-white">
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
                  <p className="text-xs text-gray-600">
                    Employees can work at multiple dealerships with different schedules
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule Template Section */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Shift Hours & Punch Windows
              </CardTitle>
              <CardDescription>
                Configure daily shift times and punch-in restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Shift Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift-start" className="text-sm font-medium">
                    Shift Start Time
                  </Label>
                  <Input
                    id="shift-start"
                    type="time"
                    value={scheduleTemplate.shift_start_time}
                    onChange={(e) =>
                      setScheduleTemplate({ ...scheduleTemplate, shift_start_time: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift-end" className="text-sm font-medium">
                    Shift End Time
                  </Label>
                  <Input
                    id="shift-end"
                    type="time"
                    value={scheduleTemplate.shift_end_time}
                    onChange={(e) =>
                      setScheduleTemplate({ ...scheduleTemplate, shift_end_time: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Punch Windows */}
              <div className="pt-3 border-t border-blue-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Punch Window Restrictions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="early-minutes" className="text-sm">
                      Early Punch (minutes)
                    </Label>
                    <Input
                      id="early-minutes"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="No limit"
                      value={scheduleTemplate.early_punch_allowed_minutes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        setScheduleTemplate({
                          ...scheduleTemplate,
                          early_punch_allowed_minutes: value !== undefined && isNaN(value) ? undefined : value
                        });
                      }}
                      className="bg-white"
                    />
                    <p className="text-xs text-gray-600">
                      Minutes before shift start. Leave empty for no restriction.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late-minutes" className="text-sm">
                      Late Punch (minutes)
                    </Label>
                    <Input
                      id="late-minutes"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="No limit"
                      value={scheduleTemplate.late_punch_grace_minutes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        setScheduleTemplate({
                          ...scheduleTemplate,
                          late_punch_grace_minutes: value !== undefined && isNaN(value) ? undefined : value
                        });
                      }}
                      className="bg-white"
                    />
                    <p className="text-xs text-gray-600">
                      Minutes after shift start. Leave empty for no restriction.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Days */}
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Work Days
              </CardTitle>
              <CardDescription>
                Select which days this employee works at this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { value: 0, label: 'Sun', fullName: 'Sunday' },
                    { value: 1, label: 'Mon', fullName: 'Monday' },
                    { value: 2, label: 'Tue', fullName: 'Tuesday' },
                    { value: 3, label: 'Wed', fullName: 'Wednesday' },
                    { value: 4, label: 'Thu', fullName: 'Thursday' },
                    { value: 5, label: 'Fri', fullName: 'Friday' },
                    { value: 6, label: 'Sat', fullName: 'Saturday' },
                  ].map((day) => {
                    const isSelected = (scheduleTemplate.days_of_week || []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const current = scheduleTemplate.days_of_week || [];
                          const updated = isSelected
                            ? current.filter((d) => d !== day.value)
                            : [...current, day.value].sort();
                          setScheduleTemplate({ ...scheduleTemplate, days_of_week: updated });
                        }}
                        title={day.fullName}
                        className={
                          isSelected
                            ? "h-11 w-full rounded-lg border-2 bg-emerald-500 border-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:shadow-md font-semibold transition-all duration-200 text-sm"
                            : "h-11 w-full rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 font-semibold transition-all duration-200 text-sm"
                        }
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 text-center">
                  Click to toggle days • Selected: {(scheduleTemplate.days_of_week || []).length} days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Break Duration */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600" />
                Break Configuration
              </CardTitle>
              <CardDescription>
                Required break duration for this shift
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="break-minutes" className="text-sm font-medium">
                    Required Break (minutes)
                  </Label>
                  <Input
                    id="break-minutes"
                    type="number"
                    min="0"
                    max="120"
                    placeholder="30"
                    value={scheduleTemplate.required_break_minutes}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setScheduleTemplate({
                        ...scheduleTemplate,
                        required_break_minutes: isNaN(value) ? 0 : value
                      });
                    }}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-600">
                    Typical break: 30 minutes for 8-hour shifts
                  </p>
                </div>
                <div className="flex items-center gap-3 h-10 pb-6">
                  <Switch
                    checked={scheduleTemplate.break_is_paid ?? false}
                    onCheckedChange={(checked) =>
                      setScheduleTemplate({ ...scheduleTemplate, break_is_paid: checked })
                    }
                  />
                  <Label className="text-sm font-medium">Break is Paid</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security requirements for this assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 shadow-sm">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Require Face Recognition
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Employee must pass face recognition to punch in/out
                  </p>
                </div>
                <Switch
                  checked={scheduleTemplate.require_face_validation ?? false}
                  onCheckedChange={(checked) =>
                    setScheduleTemplate({ ...scheduleTemplate, require_face_validation: checked })
                  }
                />
              </div>
              {scheduleTemplate.require_face_validation && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Employee must have face enrollment completed before this setting takes effect.
                      Face recognition must also be enabled at the kiosk level.
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Close Configuration */}
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                {t('detail_hub.employees.auto_close_section_title')}
              </CardTitle>
              <CardDescription>
                Automatically close forgotten punch-outs after shift ends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable/Disable Auto-Close */}
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {t('detail_hub.employees.auto_close_enabled')}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t('detail_hub.employees.auto_close_enabled_help')}
                  </p>
                </div>
                <Switch
                  checked={scheduleTemplate.auto_close_enabled ?? false}
                  onCheckedChange={(checked) =>
                    setScheduleTemplate({ ...scheduleTemplate, auto_close_enabled: checked })
                  }
                />
              </div>

              {/* Auto-Close Timing (only if enabled) */}
              {scheduleTemplate.auto_close_enabled && (
                <div className="space-y-4 pt-2 border-t border-indigo-100">
                  <h4 className="text-sm font-medium text-gray-700">{t('detail_hub.employees.auto_close_timing')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reminder" className="text-sm">
                        {t('detail_hub.employees.auto_close_reminder_label')}
                      </Label>
                      <Input
                        id="reminder"
                        type="number"
                        min="5"
                        max="180"
                        placeholder="30"
                        value={scheduleTemplate.auto_close_first_reminder ?? 30}
                        onChange={(e) =>
                          setScheduleTemplate({
                            ...scheduleTemplate,
                            auto_close_first_reminder: parseInt(e.target.value) || 30
                          })
                        }
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-600">
                        {t('detail_hub.employees.auto_close_reminder_help')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto-close-window" className="text-sm">
                        {t('detail_hub.employees.auto_close_window_label')}
                      </Label>
                      <Input
                        id="auto-close-window"
                        type="number"
                        min="30"
                        max="480"
                        placeholder="60"
                        value={scheduleTemplate.auto_close_window_minutes ?? 60}
                        onChange={(e) =>
                          setScheduleTemplate({
                            ...scheduleTemplate,
                            auto_close_window_minutes: parseInt(e.target.value) || 60
                          })
                        }
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-600">
                        {t('detail_hub.employees.auto_close_window_help')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-gray-200 bg-gray-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes (Optional)</CardTitle>
              <CardDescription>
                Add any additional information about this assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                placeholder="e.g., Training schedule, special accommodations, temporary assignment details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-white resize-none"
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="pt-5 border-t gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-w-24"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!isEditMode && !selectedDealerId)}
            className="min-w-32 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
