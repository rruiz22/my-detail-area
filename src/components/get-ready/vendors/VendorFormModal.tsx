import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useCreateVendor, useUpdateVendor } from '@/hooks/useVendors';
import type { Vendor, VendorSpecialty } from '@/types/getReady';

interface VendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  mode: 'create' | 'edit';
}

const SPECIALTY_OPTIONS: Array<{ value: VendorSpecialty; label: string }> = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'body_work', label: 'Body Work' },
  { value: 'paint', label: 'Paint' },
  { value: 'detailing', label: 'Detailing' },
  { value: 'glass', label: 'Glass' },
  { value: 'upholstery', label: 'Upholstery' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' }
];

export function VendorFormModal({ open, onOpenChange, vendor, mode }: VendorFormModalProps) {
  const { t } = useTranslation();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const [formData, setFormData] = useState({
    name: '',
    specialties: [] as VendorSpecialty[],
    contact_info: {
      email: '',
      phone: '',
      address: '',
      contact_person: ''
    },
    performance_rating: null as number | null,
    is_active: true,
    notes: ''
  });

  // Initialize form with vendor data when editing
  useEffect(() => {
    if (mode === 'edit' && vendor) {
      setFormData({
        name: vendor.name,
        specialties: vendor.specialties || [],
        contact_info: vendor.contact_info || {
          email: '',
          phone: '',
          address: '',
          contact_person: ''
        },
        performance_rating: vendor.performance_rating,
        is_active: vendor.is_active,
        notes: vendor.notes || ''
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        name: '',
        specialties: [],
        contact_info: {
          email: '',
          phone: '',
          address: '',
          contact_person: ''
        },
        performance_rating: null,
        is_active: true,
        notes: ''
      });
    }
  }, [mode, vendor, open]);

  const toggleSpecialty = (specialty: VendorSpecialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    try {
      if (mode === 'create') {
        await createVendor.mutateAsync(formData);
      } else if (vendor) {
        await updateVendor.mutateAsync({
          id: vendor.id,
          ...formData
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const isSubmitting = createVendor.isPending || updateVendor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('get_ready.vendors.create_vendor')
              : t('get_ready.vendors.edit_vendor')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('get_ready.vendors.create_vendor_description')
              : t('get_ready.vendors.edit_vendor_description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('get_ready.vendors.vendor_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('get_ready.vendors.vendor_name_placeholder')}
              required
            />
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <Label>{t('get_ready.vendors.specialties')}</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={formData.specialties.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleSpecialty(value)}
                >
                  {label}
                  {formData.specialties.includes(value) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('get_ready.vendors.contact_information')}</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">{t('get_ready.vendors.contact_person')}</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_info.contact_person}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, contact_person: e.target.value }
                  }))}
                  placeholder={t('get_ready.vendors.contact_person_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('get_ready.vendors.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contact_info.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, phone: e.target.value }
                  }))}
                  placeholder={t('get_ready.vendors.phone_placeholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('get_ready.vendors.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_info.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contact_info: { ...prev.contact_info, email: e.target.value }
                }))}
                placeholder={t('get_ready.vendors.email_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('get_ready.vendors.address')}</Label>
              <Input
                id="address"
                value={formData.contact_info.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  contact_info: { ...prev.contact_info, address: e.target.value }
                }))}
                placeholder={t('get_ready.vendors.address_placeholder')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('get_ready.vendors.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('get_ready.vendors.notes_placeholder')}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting
                ? t('common.saving')
                : mode === 'create'
                ? t('get_ready.vendors.create')
                : t('common.save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
