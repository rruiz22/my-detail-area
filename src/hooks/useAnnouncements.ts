import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Announcement {
  id: string;
  title: string;
  content: string; // HTML content
  type: 'info' | 'warning' | 'alert' | 'success';
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_roles: string[] | null;
  target_dealer_ids: number[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_roles: string[] | null;
  target_dealer_ids: number[] | null;
}

/**
 * Hook to fetch active announcements for the current user
 * Automatically filters by user role and dealer
 */
export const useActiveAnnouncements = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['announcements', 'active', user?.id],
    queryFn: async () => {
      // Use the RPC function for optimized filtering
      const { data, error } = await supabase
        .rpc('get_active_announcements');

      if (error) {
        console.error('Error fetching active announcements:', error);
        throw error;
      }

      return (data || []) as Announcement[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

/**
 * Hook to fetch all announcements (admin only)
 */
export const useAllAnnouncements = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all announcements:', error);
        throw error;
      }

      return (data || []) as Announcement[];
    },
    enabled: !!user && user.role === 'system_admin',
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to create a new announcement (admin only)
 */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return announcement as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update an announcement (admin only)
 */
export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementFormData> }) => {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return announcement as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: 'Success',
        description: 'Announcement updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update announcement',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete an announcement (admin only)
 */
export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to toggle announcement active status (admin only)
 */
export const useToggleAnnouncementStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return announcement as Announcement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: 'Success',
        description: `Announcement ${data.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    },
    onError: (error) => {
      console.error('Error toggling announcement status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update announcement status',
        variant: 'destructive',
      });
    },
  });
};
