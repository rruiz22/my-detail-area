import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Vendor, VendorWithStats, VendorSpecialty } from '@/types/getReady';

// Fetch all vendors for current dealership
export function useVendors() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['vendors', currentDealership?.id],
    queryFn: async (): Promise<Vendor[]> => {
      if (!currentDealership?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('recon_vendors')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentDealership?.id
  });
}

// Fetch vendors with performance stats
export function useVendorsWithStats() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['vendors-with-stats', currentDealership?.id],
    queryFn: async (): Promise<VendorWithStats[]> => {
      if (!currentDealership?.id) {
        return [];
      }

      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('recon_vendors')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('name', { ascending: true });

      if (vendorsError) throw vendorsError;

      if (!vendors || vendors.length === 0) {
        return [];
      }

      // Fetch work items stats for each vendor
      const vendorIds = vendors.map(v => v.id);
      const { data: workItems, error: workItemsError } = await supabase
        .from('recon_work_items')
        .select('assigned_vendor_id, status, actual_cost, actual_hours, completed_at, created_at')
        .in('assigned_vendor_id', vendorIds)
        .not('assigned_vendor_id', 'is', null);

      if (workItemsError) {
        console.error('Error fetching work items for vendors:', workItemsError);
      }

      // Calculate stats for each vendor
      const vendorsWithStats: VendorWithStats[] = vendors.map(vendor => {
        const vendorWorkItems = workItems?.filter(wi => wi.assigned_vendor_id === vendor.id) || [];
        const completedJobs = vendorWorkItems.filter(wi => wi.status === 'completed');
        const activeJobs = vendorWorkItems.filter(wi => wi.status === 'in_progress' || wi.status === 'pending');

        // Calculate average completion time
        let avgCompletionTime = 0;
        if (completedJobs.length > 0) {
          const totalTime = completedJobs.reduce((sum, job) => {
            if (job.completed_at && job.created_at) {
              const completed = new Date(job.completed_at).getTime();
              const created = new Date(job.created_at).getTime();
              return sum + (completed - created);
            }
            return sum;
          }, 0);
          avgCompletionTime = totalTime / completedJobs.length / (1000 * 60 * 60); // Convert to hours
        }

        // Calculate on-time rate (placeholder - would need SLA data)
        const onTimeRate = completedJobs.length > 0 ? 0.85 : 0; // Placeholder 85%

        // Calculate total cost YTD
        const totalCostYtd = vendorWorkItems.reduce((sum, job) => sum + (job.actual_cost || 0), 0);

        return {
          ...vendor,
          active_jobs: activeJobs.length,
          completed_jobs: completedJobs.length,
          average_completion_time: Math.round(avgCompletionTime * 10) / 10,
          on_time_rate: onTimeRate,
          total_cost_ytd: totalCostYtd
        };
      });

      return vendorsWithStats;
    },
    enabled: !!currentDealership?.id
  });
}

// Fetch single vendor by ID
export function useVendor(vendorId: string | null | undefined) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async (): Promise<Vendor | null> => {
      if (!vendorId) return null;

      const { data, error } = await supabase
        .from('recon_vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId
  });
}

// Create vendor mutation
export function useCreateVendor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentDealership } = useAccessibleDealerships();

  return useMutation({
    mutationFn: async (vendorData: Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'dealer_id'>) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('recon_vendors')
        .insert({
          ...vendorData,
          dealer_id: currentDealership.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-with-stats'] });
      toast.success(t('get_ready.vendors.vendor_created'));
    },
    onError: (error) => {
      console.error('Error creating vendor:', error);
      toast.error(t('get_ready.vendors.error_creating_vendor'));
    }
  });
}

// Update vendor mutation
export function useUpdateVendor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...vendorData }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('recon_vendors')
        .update(vendorData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      toast.success(t('get_ready.vendors.vendor_updated'));
    },
    onError: (error) => {
      console.error('Error updating vendor:', error);
      toast.error(t('get_ready.vendors.error_updating_vendor'));
    }
  });
}

// Delete vendor mutation
export function useDeleteVendor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      // First check if vendor has active work items
      const { data: activeWorkItems, error: checkError } = await supabase
        .from('recon_work_items')
        .select('id')
        .eq('assigned_vendor_id', vendorId)
        .in('status', ['pending', 'in_progress'])
        .limit(1);

      if (checkError) throw checkError;

      if (activeWorkItems && activeWorkItems.length > 0) {
        throw new Error(t('get_ready.vendors.cannot_delete_vendor_with_active_jobs'));
      }

      const { error } = await supabase
        .from('recon_vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-with-stats'] });
      toast.success(t('get_ready.vendors.vendor_deleted'));
    },
    onError: (error: any) => {
      console.error('Error deleting vendor:', error);
      toast.error(error.message || t('get_ready.vendors.error_deleting_vendor'));
    }
  });
}

// Toggle vendor active status
export function useToggleVendorStatus() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('recon_vendors')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-with-stats'] });
      toast.success(
        data.is_active
          ? t('get_ready.vendors.vendor_activated')
          : t('get_ready.vendors.vendor_deactivated')
      );
    },
    onError: (error) => {
      console.error('Error toggling vendor status:', error);
      toast.error(t('get_ready.vendors.error_updating_vendor'));
    }
  });
}
