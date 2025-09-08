import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { Car, Calendar, FileText, Package } from 'lucide-react';
import type { ReconOrder } from '@/hooks/useReconOrderManagement';

interface ReconOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: any) => Promise<void>;
  order?: ReconOrder | null;
  mode: 'create' | 'edit';
}

export const ReconOrderModal: React.FC<ReconOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  mode
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { decodeVin, loading: isDecodingVin } = useVinDecoding();

  const [formData, setFormData] = useState({
    stockNumber: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    status: 'pending',
    priority: 'normal',
    notes: '',
    dueDate: '',
    assignedContactId: '',
    dealerId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && order) {
        setFormData({
          stockNumber: order.stockNumber || '',
          vehicleVin: order.vehicleVin || '',
          vehicleYear: order.vehicleYear?.toString() || '',
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          vehicleInfo: order.vehicleInfo || '',
          status: order.status || 'pending',
          priority: order.priority || 'normal',
          notes: order.notes || '',
          dueDate: order.dueDate || '',
          assignedContactId: order.assignedContactId || '',
          dealerId: order.dealerId?.toString() || ''
        });
      } else {
        setFormData({
          stockNumber: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          status: 'pending',
          priority: 'normal',
          notes: '',
          dueDate: '',
          assignedContactId: '',
          dealerId: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, order]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleVinChange = async (vin: string) => {
    handleInputChange('vehicleVin', vin);
    
    if (vin.length === 17) {
      try {
        const decodedData = await decodeVin(vin);
        if (decodedData) {
          handleInputChange('vehicleYear', decodedData.year || '');
          handleInputChange('vehicleMake', decodedData.make || '');
          handleInputChange('vehicleModel', decodedData.model || '');
          
          const vehicleInfo = [
            decodedData.vehicleType,
            decodedData.bodyClass,
            decodedData.trim
          ].filter(Boolean).join(' • ');
          
          handleInputChange('vehicleInfo', vehicleInfo);

          toast({
            title: t('common.success'),
            description: t('orders.vin_decoded_successfully'),
          });
        }
      } catch (error) {
        console.error('Error decoding VIN:', error);
        toast({
          title: t('common.error'),
          description: t('orders.vin_decode_error'),
          variant: 'destructive',
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.stockNumber.trim()) {
      newErrors.stockNumber = t('recon.stock_number_required');
    }

    if (!formData.vehicleVin.trim()) {
      newErrors.vehicleVin = t('orders.vin_required');
    } else if (formData.vehicleVin.length !== 17) {
      newErrors.vehicleVin = t('orders.vin_invalid_length');
    }

    if (!formData.vehicleMake.trim()) {
      newErrors.vehicleMake = t('orders.make_required');
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = t('orders.model_required');
    }

    if (!formData.dealerId) {
      newErrors.dealerId = t('orders.dealer_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: t('common.error'),
        description: t('common.please_fix_errors'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting recon order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === 'create' ? t('recon.create_recon_order') : t('recon.edit_recon_order')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1 - Vehicle Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {t('orders.vehicle_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stockNumber">{t('recon.stock_number')} *</Label>
                  <Input
                    id="stockNumber"
                    value={formData.stockNumber}
                    onChange={(e) => handleInputChange('stockNumber', e.target.value)}
                    placeholder={t('recon.enter_stock_number')}
                    className={errors.stockNumber ? 'border-destructive' : ''}
                  />
                  {errors.stockNumber && (
                    <p className="text-sm text-destructive mt-1">{errors.stockNumber}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vehicleVin">{t('orders.vin')} *</Label>
                  <VinInputWithScanner
                    value={formData.vehicleVin}
                    onChange={(e) => handleVinChange(e.target.value)}
                    placeholder={t('orders.enter_vin')}
                    disabled={isDecodingVin}
                    className={errors.vehicleVin ? 'border-destructive' : ''}
                  />
                  {isDecodingVin && (
                    <p className="text-sm text-muted-foreground mt-1">{t('orders.decoding_vin')}</p>
                  )}
                  {errors.vehicleVin && (
                    <p className="text-sm text-destructive mt-1">{errors.vehicleVin}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vehicleYear">{t('orders.year')}</Label>
                  <Input
                    id="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                    placeholder={t('orders.year')}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Column 2 - Vehicle Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {t('orders.vehicle_details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vehicleMake">{t('orders.make')} *</Label>
                  <Input
                    id="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                    placeholder={t('orders.make')}
                    className={errors.vehicleMake ? 'border-destructive' : ''}
                  />
                  {errors.vehicleMake && (
                    <p className="text-sm text-destructive mt-1">{errors.vehicleMake}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vehicleModel">{t('orders.model')} *</Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder={t('orders.model')}
                    className={errors.vehicleModel ? 'border-destructive' : ''}
                  />
                  {errors.vehicleModel && (
                    <p className="text-sm text-destructive mt-1">{errors.vehicleModel}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vehicleInfo">{t('orders.additional_vehicle_info')}</Label>
                  <Input
                    id="vehicleInfo"
                    value={formData.vehicleInfo}
                    onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                    placeholder={t('orders.engine_transmission_etc')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Column 3 - Order Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('orders.order_management')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">{t('orders.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('orders.select_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                      <SelectItem value="in-progress">{t('orders.in_progress')}</SelectItem>
                      <SelectItem value="needs-approval">{t('recon.needs_approval')}</SelectItem>
                      <SelectItem value="ready-for-sale">{t('recon.ready_for_sale')}</SelectItem>
                      <SelectItem value="completed">{t('orders.completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">{t('orders.priority')}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('orders.select_priority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('orders.low')}</SelectItem>
                      <SelectItem value="normal">{t('orders.normal')}</SelectItem>
                      <SelectItem value="high">{t('orders.high')}</SelectItem>
                      <SelectItem value="urgent">{t('orders.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueDate">{t('orders.due_date')}</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    placeholder={t('orders.select_due_date')}
                  />
                </div>

                <div>
                  <Label htmlFor="dealerId">{t('orders.dealership')} *</Label>
                  <Select
                    value={formData.dealerId.toString()}
                    onValueChange={(value) => handleInputChange('dealerId', value)}
                  >
                    <SelectTrigger className={errors.dealerId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('orders.select_dealership')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Main Dealership</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.dealerId && (
                    <p className="text-sm text-destructive mt-1">{errors.dealerId}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('orders.notes_and_instructions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">{t('orders.public_notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder={t('recon.recon_instructions')}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.processing') : (
                mode === 'create' ? t('recon.create_order') : t('common.save_changes')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};