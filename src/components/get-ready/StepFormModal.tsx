import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStepManagement } from '@/hooks/useStepManagement';
import { useGetReadyUsers } from '@/hooks/useGetReadyUsers';
import { useStepAssignments } from '@/hooks/useStepAssignments';
import { GetReadyStep } from '@/types/getReady';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPicker } from './IconPicker';
import { MultiUserSelect } from './MultiUserSelect';

interface StepFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step?: GetReadyStep | null;
  nextOrderIndex: number;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
];

export function StepFormModal({ open, onOpenChange, step, nextOrderIndex }: StepFormModalProps) {
  const { t } = useTranslation();
  const { createStep, updateStep, isCreating, isUpdating } = useStepManagement();
  const { users, isLoading: isLoadingUsers } = useGetReadyUsers();
  const { assignments, isLoading: isLoadingAssignments, replaceAssignmentsAsync } = useStepAssignments(step?.id);

  const [formData, setFormData] = useState({
    name: step?.name || '',
    description: step?.description || '',
    color: step?.color || DEFAULT_COLORS[0],
    icon: step?.icon || 'circle',
    sla_hours: step?.sla_hours?.toString() || '24',
    cost_per_day: step?.cost_per_day?.toString() || '0',
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when step prop changes (for edit mode)
  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name || '',
        description: step.description || '',
        color: step.color || DEFAULT_COLORS[0],
        icon: step.icon || 'circle',
        sla_hours: step.sla_hours?.toString() || '24',
        cost_per_day: step.cost_per_day?.toString() || '0',
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        color: DEFAULT_COLORS[0],
        icon: 'circle',
        sla_hours: '24',
        cost_per_day: '0',
      });
      setSelectedUserIds([]);
    }
    setErrors({});
  }, [step]);

  // Separate effect to load assigned users (only when assignments are loaded)
  useEffect(() => {
    if (step && assignments.length > 0 && !isLoadingAssignments) {
      setSelectedUserIds(assignments.map(a => a.user_id));
    }
  }, [step?.id, isLoadingAssignments]); // Only depend on step ID and loading state

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('get_ready.setup.form.errors.name_required');
    }

    if (!formData.sla_hours || parseInt(formData.sla_hours) < 0) {
      newErrors.sla_hours = t('get_ready.setup.form.errors.sla_required');
    }

    if (selectedUserIds.length === 0) {
      newErrors.assigned_users = t('get_ready.step_form.errors.users_required') || 'At least one user must be assigned';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      icon: formData.icon,
      sla_hours: parseInt(formData.sla_hours),
      cost_per_day: parseFloat(formData.cost_per_day) || 0,
      order_index: step?.order_index || nextOrderIndex,
    };

    try {
      let stepId: string;

      if (step) {
        // Update existing step
        await updateStep({ id: step.id, ...data });
        stepId = step.id;
      } else {
        // Create new step - need to get the ID from the created step
        // Since createStep doesn't return the ID, we'll use the step name as ID
        // Note: In your useStepManagement, you might want to modify createStep to return the created step
        const createdStep = await createStep(data);
        // For now, we'll construct the ID based on the name (this matches your DB structure)
        stepId = formData.name.toLowerCase().replace(/\s+/g, '_');
      }

      // Update user assignments
      await replaceAssignmentsAsync({
        stepId: stepId,
        userIds: selectedUserIds,
        role: 'technician',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving step and assignments:', error);
      // Error toasts are handled by the mutations
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      icon: 'circle',
      sla_hours: '24',
      cost_per_day: '0',
    });
    setSelectedUserIds([]);
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {step ? t('get_ready.setup.form.title_edit') : t('get_ready.setup.form.title_create')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.setup.form.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <form onSubmit={handleSubmit} id="step-form">
            <div className="space-y-4 pb-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('get_ready.setup.form.fields.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('get_ready.setup.form.placeholders.name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('get_ready.setup.form.fields.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('get_ready.setup.form.placeholders.description')}
                rows={3}
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>{t('get_ready.setup.form.fields.color')}</Label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-10 h-10 rounded-lg border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: formData.color === color ? '#000' : 'transparent',
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
              label={t('get_ready.setup.form.fields.icon')}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* SLA Hours */}
              <div className="space-y-2">
                <Label htmlFor="sla_hours">
                  {t('get_ready.setup.form.fields.sla_hours')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sla_hours"
                  type="number"
                  min="0"
                  value={formData.sla_hours}
                  onChange={(e) => setFormData({ ...formData, sla_hours: e.target.value })}
                  className={errors.sla_hours ? 'border-red-500' : ''}
                />
                {errors.sla_hours && <p className="text-sm text-red-500">{errors.sla_hours}</p>}
              </div>

            </div>

            {/* Cost per Day */}
            <div className="space-y-2">
              <Label htmlFor="cost_per_day">{t('get_ready.setup.form.fields.cost_per_day')}</Label>
              <Input
                id="cost_per_day"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_per_day}
                onChange={(e) => setFormData({ ...formData, cost_per_day: e.target.value })}
              />
            </div>

            {/* Assigned Users - REQUIRED */}
            <div className="space-y-2">
              <Label>
                {t('get_ready.step_form.fields.assigned_users') || 'Assigned Users'}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('get_ready.step_form.fields.assigned_users_description') || 'Select users who will be notified when vehicles enter this step'}
              </p>
              <MultiUserSelect
                users={users}
                value={selectedUserIds}
                onChange={setSelectedUserIds}
                placeholder={t('get_ready.step_form.select_users_placeholder') || 'Select users...'}
                disabled={isLoadingUsers || isLoading}
              />
              {errors.assigned_users && (
                <p className="text-sm text-red-500">{errors.assigned_users}</p>
              )}
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('get_ready.step_form.users_selected', { count: selectedUserIds.length }) || `${selectedUserIds.length} user(s) selected`}
                </p>
              )}
            </div>
          </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.action_buttons.cancel')}
          </Button>
          <Button
            type="submit"
            form="step-form"
            disabled={isLoading}
          >
            {isLoading
              ? t('common.status.loading')
              : step
                ? t('common.action_buttons.update')
                : t('common.action_buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}