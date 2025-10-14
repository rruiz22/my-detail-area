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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReady } from '@/hooks/useGetReady';
import { useVehicleManagement } from '@/hooks/useVehicleManagement';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { Loader2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface VehicleFormData {
  stock_number: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  step_id: string;
  workflow_type: 'standard' | 'express' | 'priority';
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  assigned_to: string;
  notes: string;
}

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string | null;
  onSuccess?: () => void;
}

const initialFormData: VehicleFormData = {
  stock_number: '',
  vin: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  step_id: 'inspection',
  workflow_type: 'standard',
  priority: 'normal',
  assigned_to: '',
  notes: '',
};

export function VehicleFormModal({
  open,
  onOpenChange,
  vehicleId,
  onSuccess,
}: VehicleFormModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { steps } = useGetReady();
  const { currentDealership } = useAccessibleDealerships();
  const { createVehicle, updateVehicle, isCreating, isUpdating } = useVehicleManagement();
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();
  const [vinDecoded, setVinDecoded] = useState(false);

  const isEditMode = !!vehicleId;
  const loading = isCreating || isUpdating;

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};

    if (!formData.stock_number.trim()) {
      newErrors.stock_number = t('get_ready.vehicle_form.errors.stock_required');
    }

    if (!formData.vin.trim()) {
      newErrors.vin = t('get_ready.vehicle_form.errors.vin_required');
    } else if (formData.vin.length !== 17) {
      newErrors.vin = t('get_ready.vehicle_form.errors.vin_invalid');
    }

    const yearNum = parseInt(formData.year);
    if (!formData.year.trim()) {
      newErrors.year = t('get_ready.vehicle_form.errors.year_required');
    } else if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      newErrors.year = t('get_ready.vehicle_form.errors.year_invalid');
    }

    if (!formData.make.trim()) {
      newErrors.make = t('get_ready.vehicle_form.errors.make_required');
    }

    if (!formData.model.trim()) {
      newErrors.model = t('get_ready.vehicle_form.errors.model_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!currentDealership?.id) {
      toast({
        description: 'No dealership selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      const vehicleData = {
        stock_number: formData.stock_number.trim(),
        vin: formData.vin.trim().toUpperCase(),
        vehicle_year: parseInt(formData.year),
        vehicle_make: formData.make.trim(),
        vehicle_model: formData.model.trim(),
        vehicle_trim: formData.trim.trim() || undefined,
        step_id: formData.step_id,
        workflow_type: formData.workflow_type,
        priority: formData.priority,
        assigned_to: formData.assigned_to.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditMode && vehicleId) {
        updateVehicle({ id: vehicleId, ...vehicleData });
      } else {
        createVehicle(vehicleData);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const updateFormData = (field: keyof VehicleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleVinChange = async (vin: string) => {
    updateFormData('vin', vin.toUpperCase());

    if (vin.length === 17 && !vinDecoded) {
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        setFormData(prev => ({
          ...prev,
          year: vehicleData.year?.toString() || '',
          make: vehicleData.make || '',
          model: vehicleData.model || '',
          trim: vehicleData.trim || '',
        }));
        setVinDecoded(true);

        // Clear errors for auto-populated fields
        setErrors(prev => ({
          ...prev,
          year: undefined,
          make: undefined,
          model: undefined,
        }));

        toast({
          description: t('get_ready.vehicle_form.vin_decoded'),
          variant: 'default'
        });
      }
    } else if (vin.length < 17) {
      setVinDecoded(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg sm:border overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? t('get_ready.vehicle_form.title.edit')
              : t('get_ready.vehicle_form.title.add')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.vehicle_form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Stock Number & VIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_number">
                  {t('get_ready.vehicle_form.fields.stock_number')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="stock_number"
                  value={formData.stock_number}
                  onChange={e => updateFormData('stock_number', e.target.value)}
                  placeholder="STK001"
                  className={errors.stock_number ? 'border-red-500' : ''}
                />
                {errors.stock_number && (
                  <p className="text-xs text-red-500">{errors.stock_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vin">
                    {t('get_ready.vehicle_form.fields.vin')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  {vinDecoded && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <Zap className="h-3 w-3" />
                      <span>{t('get_ready.vehicle_form.vin_decoded')}</span>
                    </div>
                  )}
                </div>
                <VinInputWithScanner
                  id="vin"
                  value={formData.vin}
                  onChange={e => handleVinChange(e.target.value)}
                  onVinScanned={handleVinChange}
                  placeholder="1HGBH41JXMN109186"
                  className={errors.vin ? 'border-red-500' : ''}
                  disabled={vinLoading}
                />
                {errors.vin && (
                  <p className="text-xs text-red-500">{errors.vin}</p>
                )}
                {vinLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('get_ready.vehicle_form.decoding_vin')}
                  </p>
                )}
              </div>
            </div>

            {/* Year, Make, Model */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">
                  {t('get_ready.vehicle_form.fields.year')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={e => updateFormData('year', e.target.value)}
                  placeholder="2024"
                  className={errors.year ? 'border-red-500' : ''}
                />
                {errors.year && (
                  <p className="text-xs text-red-500">{errors.year}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="make">
                  {t('get_ready.vehicle_form.fields.make')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={e => updateFormData('make', e.target.value)}
                  placeholder="Honda"
                  className={errors.make ? 'border-red-500' : ''}
                />
                {errors.make && (
                  <p className="text-xs text-red-500">{errors.make}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  {t('get_ready.vehicle_form.fields.model')}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={e => updateFormData('model', e.target.value)}
                  placeholder="Civic"
                  className={errors.model ? 'border-red-500' : ''}
                />
                {errors.model && (
                  <p className="text-xs text-red-500">{errors.model}</p>
                )}
              </div>
            </div>

            {/* Trim */}
            <div className="space-y-2">
              <Label htmlFor="trim">
                {t('get_ready.vehicle_form.fields.trim')}
              </Label>
              <Input
                id="trim"
                value={formData.trim}
                onChange={e => updateFormData('trim', e.target.value)}
                placeholder="LX"
              />
            </div>

            {/* Step & Workflow Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="step_id">
                  {t('get_ready.vehicle_form.fields.step')}
                </Label>
                <Select
                  value={formData.step_id}
                  onValueChange={value => updateFormData('step_id', value)}
                >
                  <SelectTrigger id="step_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {steps
                      .filter(step => step.id !== 'all')
                      .map(step => (
                        <SelectItem key={step.id} value={step.id}>
                          {step.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow_type">
                  {t('get_ready.vehicle_form.fields.workflow')}
                </Label>
                <Select
                  value={formData.workflow_type}
                  onValueChange={value => updateFormData('workflow_type', value as any)}
                >
                  <SelectTrigger id="workflow_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      {t('get_ready.workflow.standard')}
                    </SelectItem>
                    <SelectItem value="express">
                      {t('get_ready.workflow.express')}
                    </SelectItem>
                    <SelectItem value="priority">
                      {t('get_ready.workflow.priority')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority & Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">
                  {t('get_ready.vehicle_form.fields.priority')}
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={value => updateFormData('priority', value as any)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('common.priority.low')}</SelectItem>
                    <SelectItem value="normal">{t('common.priority.normal')}</SelectItem>
                    <SelectItem value="medium">{t('common.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('common.priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('common.priority.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">
                  {t('get_ready.vehicle_form.fields.assigned_to')}
                </Label>
                <Input
                  id="assigned_to"
                  value={formData.assigned_to}
                  onChange={e => updateFormData('assigned_to', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                {t('get_ready.vehicle_form.fields.notes')}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => updateFormData('notes', e.target.value)}
                placeholder={t('get_ready.vehicle_form.placeholders.notes')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode
                ? t('common.actions.update')
                : t('common.actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}