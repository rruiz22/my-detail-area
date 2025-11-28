/**
 * Detail Hub Kiosks Database Integration
 *
 * Real Supabase queries using TanStack Query for kiosk device management.
 * Now with Real-time subscriptions for live status updates.
 *
 * PHASE: Real Database Integration + Real-time
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES (matching database schema)
// =====================================================

export interface DetailHubKiosk {
  id: string;
  dealership_id: number;
  kiosk_code: string; // e.g., KIOSK-001

  // Kiosk information
  name: string;
  location: string | null;
  description: string | null;

  // Network configuration
  ip_address: string | null;
  mac_address: string | null;

  // Status monitoring
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  camera_status: 'active' | 'inactive' | 'error';
  last_ping: string | null;
  last_heartbeat: string | null;

  // Face recognition settings
  face_recognition_enabled: boolean;
  face_confidence_threshold: number; // 0-100

  // Kiosk behavior settings
  kiosk_mode: boolean;
  auto_sleep: boolean;
  sleep_timeout_minutes: number;
  allow_manual_entry: boolean;
  require_photo_fallback: boolean;

  // Display settings
  screen_brightness: number; // 0-100
  volume: number; // 0-100
  theme: string | null;

  // Statistics
  total_punches: number;
  punches_today: number;
  last_punch_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  kiosks: (dealershipId: number | 'all') => ['detail-hub', 'kiosks', dealershipId],
  kioskById: (kioskId: string) => ['detail-hub', 'kiosk', kioskId],
  kioskStats: (dealershipId: number | 'all') => ['detail-hub', 'kiosk-stats', dealershipId],
} as const;

// =====================================================
// KIOSKS QUERIES
// =====================================================

export function useDetailHubKiosks() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.kiosks(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_kiosks')
        .select('*')
        .eq('archived', false) // ✅ NEW: Exclude archived kiosks
        .order('created_at', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error} = await query;

      if (error) throw error;
      return data as DetailHubKiosk[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (kiosk status changes frequently)
    gcTime: GC_TIMES.MEDIUM,
  });

  // Real-time subscription for live updates
  useEffect(() => {
    if (!user) return;

    console.log('[Kiosks] 🔴 Subscribing to real-time updates for dealership:', selectedDealerId);

    const channel = supabase
      .channel('detail_hub_kiosks_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'detail_hub_kiosks',
          filter: selectedDealerId !== 'all' ? `dealership_id=eq.${selectedDealerId}` : undefined
        },
        (payload) => {
          console.log('[Kiosks] 📡 Real-time update received:', payload);

          // Invalidate and refetch kiosks on any change
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('[Kiosks] 🔴 Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user, selectedDealerId, queryClient]);

  return query;
}

export function useDetailHubKioskById(kioskId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.kioskById(kioskId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_hub_kiosks')
        .select('*')
        .eq('id', kioskId)
        .single();

      if (error) throw error;
      return data as DetailHubKiosk;
    },
    enabled: !!user && !!kioskId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useCreateKiosk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (kioskData: Partial<DetailHubKiosk>) => {
      const { data, error } = await supabase
        .from('detail_hub_kiosks')
        .insert({
          ...kioskData,
          dealership_id: kioskData.dealership_id || (selectedDealerId !== 'all' ? selectedDealerId : undefined),
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubKiosk;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });
      toast({
        title: "Kiosk Created",
        description: `${data.name} (${data.kiosk_code}) has been added successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create kiosk',
        variant: "destructive"
      });
    }
  });
}

export function useUpdateKiosk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DetailHubKiosk> }) => {
      const { data, error } = await supabase
        .from('detail_hub_kiosks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubKiosk;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskById(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });
      toast({
        title: "Kiosk Updated",
        description: "Kiosk configuration has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update kiosk',
        variant: "destructive"
      });
    }
  });
}

export function useDeleteKiosk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('detail_hub_kiosks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });
      toast({
        title: "Kiosk Deleted",
        description: "Kiosk has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete kiosk',
        variant: "destructive"
      });
    }
  });
}

// ✅ NEW: Archive kiosk (soft-delete)
export function useArchiveKiosk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('archive_kiosk', {
        p_kiosk_id: id,
        p_archived_by: user?.id || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });

      const deviceCount = result.device_count || 0;

      toast({
        title: "Kiosk Archived",
        description: deviceCount > 0
          ? `${result.message} ${deviceCount} device(s) will need reconfiguration if this kiosk is unarchived.`
          : "Kiosk has been archived successfully.",
        duration: 8000,
        className: deviceCount > 0 ? 'bg-amber-50 border-amber-500' : undefined
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to archive kiosk',
        variant: "destructive"
      });
    }
  });
}

// ✅ NEW: Unarchive kiosk (restore)
export function useUnarchiveKiosk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('unarchive_kiosk', {
        p_kiosk_id: id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });

      toast({
        title: "Kiosk Unarchived",
        description: result.message || "Kiosk has been restored successfully.",
        className: 'bg-emerald-50 border-emerald-500'
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to unarchive kiosk',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// KIOSK OPERATIONS
// =====================================================

export function useUpdateKioskHeartbeat() {
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (kioskCode: string) => {
      const { error } = await supabase.rpc('update_kiosk_heartbeat', {
        p_kiosk_code: kioskCode
      });

      if (error) throw error;
      return kioskCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
    }
  });
}

export function useIncrementKioskPunchCounter() {
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (kioskCode: string) => {
      const { error } = await supabase.rpc('increment_kiosk_punch_counter', {
        p_kiosk_code: kioskCode
      });

      if (error) throw error;
      return kioskCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiosks(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kioskStats(selectedDealerId) });
    }
  });
}

// =====================================================
// KIOSK STATISTICS
// =====================================================

export interface KioskStatistics {
  total_kiosks: number;
  online_kiosks: number;
  offline_kiosks: number;
  total_punches_today: number;
  average_uptime: number;
}

export function useKioskStatistics() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.kioskStats(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Build query for kiosks
      let query = supabase
        .from('detail_hub_kiosks')
        .select('status, punches_today');

      // Filter by dealership if not 'all'
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data: kiosks, error } = await query;

      if (error) throw error;

      // Aggregate stats client-side
      const stats: KioskStatistics = {
        total_kiosks: kiosks.length,
        online_kiosks: kiosks.filter(k => k.status === 'online').length,
        offline_kiosks: kiosks.filter(k => k.status === 'offline').length,
        total_punches_today: kiosks.reduce((sum, k) => sum + (k.punches_today || 0), 0),
        average_uptime: kiosks.length > 0
          ? (kiosks.filter(k => k.status === 'online').length / kiosks.length) * 100
          : 0
      };

      return stats;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// HELPER FUNCTION: Generate next kiosk code
// =====================================================
export async function generateKioskCode(dealershipId: number): Promise<string> {
  const { data, error } = await supabase
    .from('detail_hub_kiosks')
    .select('kiosk_code')
    .eq('dealership_id', dealershipId)
    .order('kiosk_code', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) {
    return 'KIOSK-001';
  }

  // Extract number from last kiosk code (e.g., KIOSK-001 -> 1)
  const lastCode = data[0].kiosk_code;
  const match = lastCode.match(/\d+$/);
  const lastNumber = match ? parseInt(match[0]) : 0;

  // Generate next code with zero padding
  return `KIOSK-${String(lastNumber + 1).padStart(3, '0')}`;
}
