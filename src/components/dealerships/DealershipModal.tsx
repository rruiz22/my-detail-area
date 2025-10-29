import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Dealership, DealershipFormData, DealershipStatus, SubscriptionPlan } from '@/types/dealership';
import { toast } from 'sonner';
import { Building2, Palette } from 'lucide-react';
import { LogoUploader } from './LogoUploader';

interface DealershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dealership?: Dealership | null;
  onRefresh?: () => void; // Optional: Refresh without closing modal
}

export function DealershipModal({ isOpen, onClose, onSuccess, dealership, onRefresh }: DealershipModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isEditing = !!dealership;

  // Handler for logo upload that refreshes data without closing modal
  const handleLogoUploadSuccess = () => {
    if (onRefresh) {
      onRefresh(); // Use custom refresh if provided
    } else {
      onSuccess(); // Fallback to onSuccess (which closes modal)
    }
  };

  const [formData, setFormData] = useState<DealershipFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    website: '',
    tax_number: '',
    logo_url: '',
    primary_color: '#3B82F6',
    status: 'active',
    subscription_plan: 'basic',
    max_users: 5,
    notes: '',
  });

  useEffect(() => {
    if (dealership) {
      setFormData({
        name: dealership.name,
        email: dealership.email,
        phone: dealership.phone || '',
        address: dealership.address || '',
        city: dealership.city || '',
        state: dealership.state || '',
        zip_code: dealership.zip_code || '',
        country: dealership.country || 'US',
        website: dealership.website || '',
        tax_number: dealership.tax_number || '',
        logo_url: dealership.logo_url || '',
        primary_color: dealership.primary_color,
        status: dealership.status,
        subscription_plan: dealership.subscription_plan,
        max_users: dealership.max_users,
        notes: dealership.notes || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'US',
        website: '',
        tax_number: '',
        logo_url: '',
        primary_color: '#3B82F6',
        status: 'active',
        subscription_plan: 'basic',
        max_users: 5,
        notes: '',
      });
    }
  }, [dealership]);

  const handleInputChange = (field: keyof DealershipFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error(t('messages.required_field'));
      return;
    }

    try {
      setLoading(true);

      if (isEditing && dealership) {
        const { error } = await supabase
          .from('dealerships')
          .update(formData)
          .eq('id', dealership.id);

        if (error) throw error;
        toast.success(t('messages.saved'));
      } else {
        const { error } = await supabase
          .from('dealerships')
          .insert(formData);

        if (error) throw error;
        toast.success(t('messages.saved'));
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving dealership:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const maxUsersByPlan = {
    basic: 5,
    premium: 25,
    enterprise: 100,
  };

  const handlePlanChange = (plan: SubscriptionPlan) => {
    setFormData(prev => ({
      ...prev,
      subscription_plan: plan,
      max_users: maxUsersByPlan[plan]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        preventOutsideClick={true}
        className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? t('dealerships.edit') : t('dealerships.add_new')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-w-3xl mx-auto">
          <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('dealerships.business_info')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="block mb-3">{t('dealerships.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter dealership name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_number" className="block mb-3">{t('dealerships.tax_number')}</Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => handleInputChange('tax_number', e.target.value)}
                      placeholder="Enter tax number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="block mb-3">{t('dealerships.website')}</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('dealerships.contact_info')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="block mb-3">{t('dealerships.email')} *</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      type="email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="block mb-3">{t('dealerships.phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Subscription Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('dealerships.subscription_settings')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subscription_plan" className="block mb-3">{t('dealerships.subscription_plan')}</Label>
                    <Select value={formData.subscription_plan} onValueChange={handlePlanChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">{t('dealerships.basic_plan')}</SelectItem>
                        <SelectItem value="premium">{t('dealerships.premium_plan')}</SelectItem>
                        <SelectItem value="enterprise">{t('dealerships.enterprise_plan')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="max_users" className="block mb-3">{t('dealerships.max_users')}</Label>
                    <Input
                      id="max_users"
                      value={formData.max_users}
                      onChange={(e) => handleInputChange('max_users', parseInt(e.target.value))}
                      type="number"
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status" className="block mb-3">{t('dealerships.status')}</Label>
                    <Select value={formData.status} onValueChange={(value: DealershipStatus) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('dealerships.active')}</SelectItem>
                        <SelectItem value="inactive">{t('dealerships.inactive')}</SelectItem>
                        <SelectItem value="suspended">{t('dealerships.suspended')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('dealerships.address_info')}</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="block mb-3">{t('dealerships.address')}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter street address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="block mb-3">{t('dealerships.city')}</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="block mb-3">{t('dealerships.state')}</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Enter state"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zip_code" className="block mb-3">{t('dealerships.zip')}</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => handleInputChange('zip_code', e.target.value)}
                        placeholder="Enter ZIP code"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country" className="block mb-3">{t('dealerships.country')}</Label>
                      <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                          <SelectItem value="BR">Brazil</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Branding */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('dealerships.branding')}</h3>
                <div className="space-y-4">
                  {/* Logo Uploader */}
                  <div>
                    <Label className="block mb-3">{t('dealerships.logo')}</Label>
                    {isEditing && dealership ? (
                      <LogoUploader
                        dealershipId={dealership.id}
                        currentLogoUrl={dealership.logo_url}
                        size="md"
                        onUploadSuccess={handleLogoUploadSuccess}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 px-3 border border-dashed rounded-lg text-center">
                        {t('dealerships.logo_upload_after_creation')}
                      </p>
                    )}
                  </div>

                  {/* Primary Color */}
                  <div>
                    <Label htmlFor="primary_color" className="flex items-center gap-2 mb-3">
                      <Palette className="h-4 w-4" />
                      {t('dealerships.primary_color')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="block mb-3">{t('dealerships.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter internal notes or comments"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}