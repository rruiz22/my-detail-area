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
import { useStepManagement } from '@/hooks/useStepManagement';
import { GetReadyStep } from '@/types/getReady';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPicker } from './IconPicker';

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

  const [formData, setFormData] = useState({
    name: step?.name || '',
    description: step?.description || '',
    color: step?.color || DEFAULT_COLORS[0],
    icon: step?.icon || 'circle',
    sla_hours: step?.sla_hours?.toString() || '24',
    cost_per_day: step?.cost_per_day?.toString() || '0',
  });

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
    }
    setErrors({});
  }, [step]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('get_ready.setup.form.errors.name_required');
    }

    if (!formData.sla_hours || parseInt(formData.sla_hours) < 0) {
      newErrors.sla_hours = t('get_ready.setup.form.errors.sla_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    if (step) {
      updateStep({ id: step.id, ...data });
    } else {
      createStep(data);
    }

    onOpenChange(false);
    resetForm();
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step ? t('get_ready.setup.form.title_edit') : t('get_ready.setup.form.title_create')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.setup.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.action_buttons.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.status.loading')
                : step
                  ? t('common.action_buttons.update')
                  : t('common.action_buttons.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}