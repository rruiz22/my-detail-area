// =====================================================
// USE EMAIL CONTACTS HOOK
// Created: 2025-11-03
// Description: CRUD operations for email contacts
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmailContact, EmailContactInput } from '@/types/email';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// QUERY: Get all contacts for a dealership
// =====================================================
export const useEmailContacts = (dealershipId: number | null) => {
  return useQuery({
    queryKey: ['email-contacts', dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];

      const { data, error } = await supabase
        .from('invoice_email_contacts')
        .select('*')
        .eq('dealership_id', dealershipId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as EmailContact[];
    },
    enabled: !!dealershipId,
  });
};

// =====================================================
// QUERY: Get default contact for a dealership
// =====================================================
export const useDefaultContact = (dealershipId: number | null) => {
  return useQuery({
    queryKey: ['default-contact', dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;

      const { data, error } = await supabase
        .from('invoice_email_contacts')
        .select('*')
        .eq('dealership_id', dealershipId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EmailContact | null;
    },
    enabled: !!dealershipId,
  });
};

// =====================================================
// MUTATION: Create email contact
// =====================================================
export const useCreateEmailContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: EmailContactInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('invoice_email_contacts')
        .insert({
          ...input,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', data.dealership_id] });
      queryClient.invalidateQueries({ queryKey: ['default-contact', data.dealership_id] });
      toast({
        title: 'Success',
        description: 'Email contact created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error creating email contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create email contact',
        variant: 'destructive',
      });
    },
  });
};

// =====================================================
// MUTATION: Update email contact
// =====================================================
export const useUpdateEmailContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailContactInput> }) => {
      const { data, error } = await supabase
        .from('invoice_email_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', data.dealership_id] });
      queryClient.invalidateQueries({ queryKey: ['default-contact', data.dealership_id] });
      toast({
        title: 'Success',
        description: 'Email contact updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating email contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email contact',
        variant: 'destructive',
      });
    },
  });
};

// =====================================================
// MUTATION: Delete email contact (soft delete)
// =====================================================
export const useDeleteEmailContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, dealershipId }: { id: string; dealershipId: number }) => {
      const { error } = await supabase
        .from('invoice_email_contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return { id, dealershipId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', data.dealershipId] });
      queryClient.invalidateQueries({ queryKey: ['default-contact', data.dealershipId] });
      toast({
        title: 'Success',
        description: 'Email contact deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting email contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete email contact',
        variant: 'destructive',
      });
    },
  });
};

// =====================================================
// MUTATION: Toggle default contact
// =====================================================
export const useToggleDefaultContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, dealershipId, isDefault }: { id: string; dealershipId: number; isDefault: boolean }) => {
      const { data, error } = await supabase
        .from('invoice_email_contacts')
        .update({ is_default: isDefault })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', data.dealership_id] });
      queryClient.invalidateQueries({ queryKey: ['default-contact', data.dealership_id] });
      toast({
        title: 'Success',
        description: data.is_default ? 'Set as default contact' : 'Removed from default',
      });
    },
    onError: (error: any) => {
      console.error('Error toggling default contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update default contact',
        variant: 'destructive',
      });
    },
  });
};
