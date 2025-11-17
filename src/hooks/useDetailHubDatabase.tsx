/**
 * Detail Hub Database Integration
 *
 * Real Supabase queries using TanStack Query for employee and time entry management.
 * Replaces mock data in useDetailHubIntegration with real database operations.
 *
 * PHASE: Opción A - Real Database Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES (matching database schema)
// =====================================================

export interface DetailHubEmployee {
  id: string;
  dealership_id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: 'detailer' | 'car_wash' | 'supervisor' | 'manager' | 'technician';
  department: 'detail' | 'car_wash' | 'service' | 'management';
  hourly_rate: number | null;
  hire_date: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';

  // Face Recognition
  face_enrolled: boolean;
  face_collection_id: string | null;
  face_id: string | null;
  face_confidence: number | null;
  enrolled_at: string | null;

  // Fallback Methods
  fallback_photo_url: string | null;
  fallback_photo_enabled: boolean;
  pin_code: string | null;

  created_at: string;
  updated_at: string;
}

export interface DetailHubTimeEntry {
  id: string;
  employee_id: string;
  dealership_id: number;

  // Time Tracking
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  break_duration_minutes: number;

  // Hours (auto-calculated by trigger)
  total_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;

  // Punch Methods
  punch_in_method: 'face' | 'pin' | 'manual' | 'photo_fallback' | null;
  punch_out_method: 'face' | 'pin' | 'manual' | 'photo_fallback' | null;
  face_confidence_in: number | null;
  face_confidence_out: number | null;

  // Photo Fallback
  photo_in_url: string | null;
  photo_out_url: string | null;

  // Verification
  requires_manual_verification: boolean;
  verified_by: string | null;
  verified_at: string | null;

  // Metadata
  kiosk_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'active' | 'complete' | 'disputed' | 'approved';
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  employees: (dealershipId: number | 'all') => ['detail-hub', 'employees', dealershipId],
  timeEntries: (dealershipId: number | 'all') => ['detail-hub', 'time-entries', dealershipId],
  pendingReviews: (dealershipId: number | 'all') => ['detail-hub', 'pending-reviews', dealershipId],
} as const;

// =====================================================
// EMPLOYEES QUERIES
// =====================================================

export function useDetailHubEmployees() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.employees(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_employees')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DetailHubEmployee[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (employeeData: Partial<DetailHubEmployee>) => {
      const { data, error } = await supabase
        .from('detail_hub_employees')
        .insert({
          ...employeeData,
          dealership_id: employeeData.dealership_id || (selectedDealerId !== 'all' ? selectedDealerId : undefined),
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees(selectedDealerId) });
      toast({
        title: "Employee Created",
        description: `${data.first_name} ${data.last_name} has been added successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create employee',
        variant: "destructive"
      });
    }
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DetailHubEmployee> }) => {
      const { data, error } = await supabase
        .from('detail_hub_employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees(selectedDealerId) });
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update employee',
        variant: "destructive"
      });
    }
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('detail_hub_employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees(selectedDealerId) });
      toast({
        title: "Employee Deleted",
        description: "Employee has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete employee',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// TIME ENTRIES QUERIES
// =====================================================

export function useDetailHubTimeEntries() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.timeEntries(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select('*')
        .order('clock_in', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DetailHubTimeEntry[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (time data changes frequently)
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      dealershipId: number;
      method?: 'face' | 'pin' | 'manual' | 'photo_fallback';
      photoUrl?: string;
      faceConfidence?: number;
      kioskId?: string;
      scheduleId?: string; // NEW: Link to schedule
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Check if already clocked in
      const { data: existing } = await supabase
        .from('detail_hub_time_entries')
        .select('id')
        .eq('employee_id', params.employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        throw new Error('Employee is already clocked in');
      }

      // Create time entry
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .insert({
          employee_id: params.employeeId,
          dealership_id: params.dealershipId,
          clock_in: new Date().toISOString(),
          punch_in_method: params.method || 'manual',
          photo_in_url: params.photoUrl,
          face_confidence_in: params.faceConfidence,
          requires_manual_verification: params.method === 'photo_fallback' || (params.faceConfidence ? params.faceConfidence < 80 : false),
          kiosk_id: params.kioskId,
          schedule_id: params.scheduleId, // NEW: Link to schedule (triggers auto-calculate variance)
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingReviews(selectedDealerId) });

      const toastMessage = data.punch_in_method === 'photo_fallback'
        ? 'Photo captured. Awaiting supervisor approval.'
        : `Successfully clocked in at ${new Date().toLocaleTimeString()}`;

      toast({
        title: data.punch_in_method === 'photo_fallback' ? "Photo Punch Recorded" : "Clocked In",
        description: toastMessage
      });
    },
    onError: (error) => {
      toast({
        title: "Clock In Failed",
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: "destructive"
      });
    }
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      method?: 'face' | 'pin' | 'manual' | 'photo_fallback';
      photoUrl?: string;
      faceConfidence?: number;
    }) => {
      // Find active time entry
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('*')
        .eq('employee_id', params.employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!activeEntry) throw new Error('No active time entry found');

      // Update with clock out
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          clock_out: new Date().toISOString(),
          punch_out_method: params.method || 'manual',
          photo_out_url: params.photoUrl,
          face_confidence_out: params.faceConfidence,
          // Hours and status will be auto-calculated by database trigger
        })
        .eq('id', activeEntry.id)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Clocked Out",
        description: `Successfully clocked out. Total hours: ${data.total_hours?.toFixed(2) || '0.00'}`
      });
    },
    onError: (error) => {
      toast({
        title: "Clock Out Failed",
        description: error instanceof Error ? error.message : 'Failed to clock out',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// PENDING REVIEWS QUERIES
// =====================================================

export function usePendingReviews() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.pendingReviews(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select('*')
        .eq('requires_manual_verification', true)
        .is('verified_at', null) // Not yet verified
        .order('clock_in', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DetailHubTimeEntry[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (pending reviews change frequently)
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          requires_manual_verification: false,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingReviews(selectedDealerId) });

      toast({
        title: "Punch Approved",
        description: "Time entry has been verified and approved."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to approve time entry',
        variant: "destructive"
      });
    }
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      const { error } = await supabase
        .from('detail_hub_time_entries')
        .delete()
        .eq('id', timeEntryId);

      if (error) throw error;
      return timeEntryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingReviews(selectedDealerId) });

      toast({
        title: "Punch Rejected",
        description: "Time entry has been rejected and removed.",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reject time entry',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// EMPLOYEE LOOKUP HELPER
// =====================================================

/**
 * Get employee by ID
 * Used for displaying employee name in time entries
 */
export async function getEmployeeById(employeeId: string): Promise<DetailHubEmployee | null> {
  const { data, error } = await supabase
    .from('detail_hub_employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  return data;
}

/**
 * Get employee by employee number (for kiosk lookup)
 */
export async function getEmployeeByNumber(employeeNumber: string): Promise<DetailHubEmployee | null> {
  const { data, error } = await supabase
    .from('detail_hub_employees')
    .select('*')
    .eq('employee_number', employeeNumber)
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee by number:', error);
    return null;
  }

  return data;
}
