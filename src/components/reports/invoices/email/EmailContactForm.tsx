// =====================================================
// EMAIL CONTACT FORM
// Created: 2025-11-03
// Description: Form to add/edit email contacts
// =====================================================

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { EmailContact, EmailContactInput } from '@/types/email';

interface EmailContactFormProps {
  dealershipId: number;
  contact?: EmailContact;
  onSubmit: (data: EmailContactInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EmailContactForm: React.FC<EmailContactFormProps> = ({
  dealershipId,
  contact,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<EmailContactInput>({
    dealership_id: dealershipId,
    name: '',
    email: '',
    job_title: '',
    is_default: false,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (contact) {
      setFormData({
        dealership_id: contact.dealership_id,
        name: contact.name,
        email: contact.email,
        job_title: contact.job_title || '',
        is_default: contact.is_default,
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof EmailContactInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name" className="required">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="John Doe"
          className={errors.name ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="required">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="john@example.com"
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
        )}
      </div>

      {/* Job Title */}
      <div>
        <Label htmlFor="job_title">Job Title / Position</Label>
        <Input
          id="job_title"
          value={formData.job_title}
          onChange={(e) => handleChange('job_title', e.target.value)}
          placeholder="Accounting Manager"
          disabled={isLoading}
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Default checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => handleChange('is_default', checked)}
          disabled={isLoading}
        />
        <Label
          htmlFor="is_default"
          className="text-sm font-normal cursor-pointer"
        >
          Set as default contact (automatically selected when sending invoices)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};
