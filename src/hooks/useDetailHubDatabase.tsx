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
  auditLogs: (timeEntryId: string) => ['detail-hub', 'audit-logs', timeEntryId],
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
        .select(`
          *,
          employee:detail_hub_employees!left(
            first_name,
            last_name,
            employee_number
          )
        `)
        .neq('status', 'disabled') // Filter out disabled entries
        .order('clock_in', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include employee name
      const enrichedData = (data as TimeEntryWithEmployeeRelation[] || []).map((entry) => ({
        ...entry,
        employee_name: entry.employee
          ? `${entry.employee.first_name} ${entry.employee.last_name}`
          : 'Unknown Employee',
        employee_number: entry.employee?.employee_number || 'N/A'
      })) as TimeEntryWithEmployee[];

      return enrichedData;
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
// BREAK MANAGEMENT
// =====================================================

export function useStartBreak() {
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
      if (!activeEntry) throw new Error('No active time entry found. Please clock in first.');
      if (activeEntry.break_start && !activeEntry.break_end) {
        throw new Error('Break already in progress');
      }

      // Update with break start
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          break_start: new Date().toISOString(),
          break_end: null, // Reset break_end for new break
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
        title: "Break Started",
        description: `Break started at ${new Date().toLocaleTimeString()}`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Start Break Failed",
        description: error instanceof Error ? error.message : 'Failed to start break',
        variant: "destructive"
      });
    }
  });
}

export function useEndBreak() {
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
      if (!activeEntry) throw new Error('No active time entry found. Please clock in first.');
      if (!activeEntry.break_start) {
        throw new Error('No break in progress');
      }
      if (activeEntry.break_end) {
        throw new Error('Break already ended');
      }

      // Calculate break duration
      const breakStart = new Date(activeEntry.break_start);
      const breakEnd = new Date();
      const breakDurationMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);

      // Validate minimum break duration (30 minutes)
      const MINIMUM_BREAK_MINUTES = 30;
      if (breakDurationMinutes < MINIMUM_BREAK_MINUTES) {
        throw new Error(`Break must be at least ${MINIMUM_BREAK_MINUTES} minutes. Current duration: ${breakDurationMinutes} minutes.`);
      }

      // Update with break end
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          break_end: breakEnd.toISOString(),
          break_duration_minutes: breakDurationMinutes
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
        title: "Break Ended",
        description: `Break ended. Duration: ${data.break_duration_minutes || 0} minutes`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "End Break Failed",
        description: error instanceof Error ? error.message : 'Failed to end break',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// PENDING REVIEWS QUERIES
// =====================================================

export interface TimeEntryWithEmployee extends DetailHubTimeEntry {
  employee_name: string;
  employee_number: string;
}

export interface TimeEntryAuditLog {
  id: string;
  time_entry_id: string;
  action_type: 'created' | 'updated' | 'verified' | 'approved' | 'disabled' | 'enabled' | 'clock_out' | 'break_started' | 'break_ended' | 'manual_edit';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface TimeEntryWithEmployeeRelation extends DetailHubTimeEntry {
  employee: {
    first_name: string;
    last_name: string;
    employee_number: string;
  } | null;
}

export function usePendingReviews() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.pendingReviews(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select(`
          *,
          employee:detail_hub_employees!left(
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('requires_manual_verification', true)
        .is('verified_at', null) // Not yet verified
        .order('clock_in', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include employee name
      const enrichedData = (data as TimeEntryWithEmployeeRelation[] || []).map((entry) => ({
        ...entry,
        employee_name: entry.employee
          ? `${entry.employee.first_name} ${entry.employee.last_name}`
          : 'Unknown Employee',
        employee_number: entry.employee?.employee_number || 'N/A'
      })) as TimeEntryWithEmployee[];

      return enrichedData;
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
// MANUAL TIME ENTRY CREATION
// =====================================================

export function useCreateManualTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      dealershipId: number;
      clockIn: string; // ISO timestamp
      clockOut?: string; // ISO timestamp (optional for active entry)
      breakStart?: string; // ISO timestamp
      breakEnd?: string; // ISO timestamp
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Validation: Check if employee already has an active entry
      const { data: existing } = await supabase
        .from('detail_hub_time_entries')
        .select('id, clock_in, clock_out')
        .eq('employee_id', params.employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        throw new Error('Employee already has an active time entry. Please clock them out first.');
      }

      // Validation: Check for overlapping entries
      if (params.clockOut) {
        const { data: overlapping } = await supabase
          .from('detail_hub_time_entries')
          .select('id')
          .eq('employee_id', params.employeeId)
          .or(`and(clock_in.lte.${params.clockOut},clock_out.gte.${params.clockIn})`)
          .limit(1);

        if (overlapping && overlapping.length > 0) {
          throw new Error('Time entry overlaps with existing entry for this employee.');
        }
      }

      // Calculate break duration if both start and end provided
      let breakDurationMinutes = 0;
      if (params.breakStart && params.breakEnd) {
        const breakStartTime = new Date(params.breakStart);
        const breakEndTime = new Date(params.breakEnd);
        breakDurationMinutes = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / 60000);

        if (breakDurationMinutes < 30) {
          throw new Error('Break duration must be at least 30 minutes');
        }
      }

      // Create manual time entry
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .insert({
          employee_id: params.employeeId,
          dealership_id: params.dealershipId,
          clock_in: params.clockIn,
          clock_out: params.clockOut || null,
          break_start: params.breakStart || null,
          break_end: params.breakEnd || null,
          break_duration_minutes: breakDurationMinutes,
          punch_in_method: 'manual',
          punch_out_method: params.clockOut ? 'manual' : null,
          requires_manual_verification: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          status: params.clockOut ? 'complete' : 'active',
          notes: params.notes || null
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingReviews(selectedDealerId) });

      toast({
        title: "Manual Entry Created",
        description: `Time entry has been added successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create manual time entry',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// AUDIT LOGS
// =====================================================

/**
 * Get audit log history for a specific time entry
 * Shows complete timeline of all changes
 */
export function useTimeEntryAuditLogs(timeEntryId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.auditLogs(timeEntryId || ''),
    queryFn: async () => {
      if (!user || !timeEntryId) return [];

      const { data, error } = await supabase
        .from('detail_hub_time_entry_audit')
        .select(`
          *,
          user:profiles!detail_hub_time_entry_audit_changed_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('time_entry_id', timeEntryId)
        .order('created_at', { ascending: true }); // Chronological order

      if (error) throw error;
      return data as TimeEntryAuditLog[];
    },
    enabled: !!user && !!timeEntryId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// UPDATE TIME ENTRY
// =====================================================

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      timeEntryId: string;
      clockIn?: string;
      clockOut?: string;
      breakStart?: string;
      breakEnd?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const updates: any = {
        verified_by: user.id, // Track who made the edit
        updated_at: new Date().toISOString()
      };

      if (params.clockIn) updates.clock_in = params.clockIn;
      if (params.clockOut !== undefined) updates.clock_out = params.clockOut || null;
      if (params.breakStart !== undefined) updates.break_start = params.breakStart || null;
      if (params.breakEnd !== undefined) updates.break_end = params.breakEnd || null;
      if (params.notes !== undefined) updates.notes = params.notes || null;

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update(updates)
        .eq('id', params.timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auditLogs(data.id) });

      toast({
        title: "Time Entry Updated",
        description: "Changes have been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update time entry',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// DISABLE TIME ENTRY (Soft Delete)
// =====================================================

export function useDisableTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      timeEntryId: string;
      reason?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          status: 'disabled',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          verified_by: user.id,
          notes: params.reason
            ? `DISABLED: ${params.reason}`
            : 'Entry disabled by supervisor'
        })
        .eq('id', params.timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auditLogs(data.id) });

      toast({
        title: "Entry Disabled",
        description: "Time entry has been disabled and will not appear in reports."
      });
    },
    onError: (error) => {
      toast({
        title: "Disable Failed",
        description: error instanceof Error ? error.message : 'Failed to disable time entry',
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
    // Error tracking handled by Supabase client
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
    // Error tracking handled by Supabase client
    return null;
  }

  return data;
}

// =====================================================
// RECENT ACTIVITY QUERY (with employee names)
// =====================================================

export function useRecentActivity(limit: number = 5) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['detail-hub', 'recent-activity', selectedDealerId, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select(`
          *,
          employee:detail_hub_employees!left(
            first_name,
            last_name,
            employee_number
          )
        `)
        .order('clock_in', { ascending: false })
        .limit(limit);

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include employee name
      const enrichedData = (data as TimeEntryWithEmployeeRelation[] || []).map((entry) => ({
        ...entry,
        employee_name: entry.employee
          ? `${entry.employee.first_name} ${entry.employee.last_name}`
          : 'Unknown Employee',
        employee_number: entry.employee?.employee_number || 'N/A'
      })) as TimeEntryWithEmployee[];

      return enrichedData;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// EMPLOYEE SEARCH QUERY (Kiosk)
// =====================================================

/**
 * Search employees by name or employee number
 * Used for kiosk employee lookup with fuzzy search
 *
 * @param query - Search query string (minimum 2 characters)
 * @returns Active employees matching the search criteria
 */
export function useEmployeeSearch(query: string) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['detail-hub', 'employee-search', selectedDealerId, query],
    queryFn: async () => {
      if (!user || !query || query.length < 2) return [];

      let searchQuery = supabase
        .from('detail_hub_employees')
        .select('*')
        .eq('status', 'active'); // Only active employees

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        searchQuery = searchQuery.eq('dealership_id', selectedDealerId);
      }

      // Search by first_name, last_name, or employee_number (case-insensitive)
      searchQuery = searchQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,employee_number.ilike.%${query}%`);

      // Limit results to prevent overwhelming UI
      searchQuery = searchQuery.limit(10);

      const { data, error } = await searchQuery;

      if (error) throw error;
      return data as DetailHubEmployee[];
    },
    enabled: !!user && query.length >= 2,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (search results should be fresh)
    gcTime: GC_TIMES.MEDIUM,
  });
}
