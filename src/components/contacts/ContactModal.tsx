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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ContactFormData, ContactDepartment, DealershipStatus, LanguageCode } from '@/types/dealership';
import { toast } from 'sonner';
import { User, Building2 } from 'lucide-react';

interface Contact {
  id: number;
  dealership_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  position?: string;
  department: ContactDepartment;
  is_primary: boolean;
  can_receive_notifications: boolean;
  preferred_language: LanguageCode;
  notes?: string;
  avatar_url?: string;
  status: DealershipStatus;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contact?: Contact | null;
  dealerships: { id: number; name: string }[];
}

export function ContactModal({ isOpen, onClose, onSuccess, contact, dealerships }: ContactModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isEditing = !!contact;

  const [formData, setFormData] = useState<ContactFormData>({
    dealership_id: dealerships.length > 0 ? dealerships[0].id : 0,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    position: '',
    department: 'other',
    is_primary: false,
    can_receive_notifications: true,
    preferred_language: 'en',
    notes: '',
    avatar_url: '',
    status: 'active',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        dealership_id: contact.dealership_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone || '',
        mobile_phone: contact.mobile_phone || '',
        position: contact.position || '',
        department: contact.department,
        is_primary: contact.is_primary,
        can_receive_notifications: contact.can_receive_notifications,
        preferred_language: contact.preferred_language,
        notes: contact.notes || '',
        avatar_url: contact.avatar_url || '',
        status: contact.status,
      });
    } else {
      setFormData({
        dealership_id: dealerships.length > 0 ? dealerships[0].id : 0,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile_phone: '',
        position: '',
        department: 'other',
        is_primary: false,
        can_receive_notifications: true,
        preferred_language: 'en',
        notes: '',
        avatar_url: '',
        status: 'active',
      });
    }
  }, [contact, dealerships]);

  const handleInputChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      toast.error(t('messages.required_field'));
      return;
    }

    try {
      setLoading(true);

      if (isEditing && contact) {
        const { error } = await supabase
          .from('dealership_contacts')
          .update(formData)
          .eq('id', contact.id);

        if (error) throw error;
        toast.success(t('contacts.contact_updated'));
      } else {
        const { error } = await supabase
          .from('dealership_contacts')
          .insert(formData);

        if (error) throw error;
        toast.success(t('contacts.contact_created'));
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? t('contacts.edit_contact') : t('contacts.add_new')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="dealership_id" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t('dealerships.title')} *
                </Label>
                <Select 
                  value={formData.dealership_id.toString()} 
                  onValueChange={(value) => handleInputChange('dealership_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dealerships.map((dealership) => (
                      <SelectItem key={dealership.id} value={dealership.id.toString()}>
                        {dealership.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">{t('contacts.first_name')} *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder={t('contacts.first_name_placeholder', 'John')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">{t('contacts.last_name')} *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder={t('contacts.last_name_placeholder', 'Doe')}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('contacts.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">{t('contacts.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_phone">{t('contacts.mobile_phone')}</Label>
                  <Input
                    id="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="position">{t('contacts.position')}</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder={t('contacts.position_placeholder', 'Sales Manager')}
                />
              </div>
            </div>

            {/* Right Column - Settings */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="department">{t('contacts.department')}</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value: ContactDepartment) => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">{t('contacts.sales')}</SelectItem>
                    <SelectItem value="service">{t('contacts.service')}</SelectItem>
                    <SelectItem value="parts">{t('contacts.parts')}</SelectItem>
                    <SelectItem value="management">{t('contacts.management')}</SelectItem>
                    <SelectItem value="other">{t('contacts.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preferred_language">{t('contacts.preferred_language')}</Label>
                <Select 
                  value={formData.preferred_language} 
                  onValueChange={(value: LanguageCode) => handleInputChange('preferred_language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="pt-BR">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">{t('contacts.status')}</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: DealershipStatus) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('contacts.active')}</SelectItem>
                    <SelectItem value="inactive">{t('contacts.inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('contacts.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_primary">{t('contacts.primary_contact')}</Label>
                <Switch
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => handleInputChange('is_primary', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="can_receive_notifications">{t('contacts.can_receive_notifications')}</Label>
                <Switch
                  id="can_receive_notifications"
                  checked={formData.can_receive_notifications}
                  onCheckedChange={(checked) => handleInputChange('can_receive_notifications', checked)}
                />
              </div>

              <div>
                <Label htmlFor="avatar_url">{t('contacts.avatar_url')}</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <Label htmlFor="notes">{t('contacts.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder={t('contacts.notes_placeholder', 'Additional notes about this contact')}
                  className="min-h-[80px]"
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
      </DialogContent>
    </Dialog>
  );
}