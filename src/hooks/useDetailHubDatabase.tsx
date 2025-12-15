/**
 * Detail Hub Database Integration
 *
 * Real Supabase queries using TanStack Query for employee and time entry management.
 * Replaces mock data in useDetailHubIntegration with real database operations.
 *
 * PHASE: Opción A - Real Database Integration
 */

import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  punch_out_method: 'face' | 'pin' | 'manual' | 'photo_fallback' | 'auto_close' | null;
  face_confidence_in: number | null;
  face_confidence_out: number | null;

  // Photo Fallback
  photo_in_url: string | null;
  photo_out_url: string | null;

  // Verification
  requires_manual_verification: boolean;
  verified_by: string | null;
  verified_at: string | null;

  // Approval (NEW: Timecard approval system)
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

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
      ipAddress?: string;
      scheduleId?: string; // Link to schedule
      notes?: string; // Optional employee note explaining punch
      // GPS location (required for remote kiosk punches)
      latitude?: number;
      longitude?: number;
      address?: string;
      locationAccuracy?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // ========================================
      // CRITICAL: Auto-close any open time entries
      // ========================================
      // This prevents duplicate active records when employee forgets to clock out
      const { data: existingEntries, error: checkError } = await supabase
        .from('detail_hub_time_entries')
        .select('id, clock_in, status')
        .eq('employee_id', params.employeeId)
        .is('clock_out', null) // No clock out recorded
        .order('clock_in', { ascending: false });

      if (checkError) {
        console.error('[ClockIn] Error checking existing entries:', checkError);
      }

      if (existingEntries && existingEntries.length > 0) {
        console.warn(`[ClockIn] Found ${existingEntries.length} open time entries for employee ${params.employeeId}`);

        // Auto-close all open entries older than 30 minutes
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        const entriesToClose = existingEntries.filter(entry => {
          const clockInTime = new Date(entry.clock_in);
          return clockInTime < thirtyMinutesAgo;
        });

        if (entriesToClose.length > 0) {
          console.warn(`[ClockIn] Auto-closing ${entriesToClose.length} old entries`);

          // Close old entries with current timestamp
          const { error: closeError } = await supabase
            .from('detail_hub_time_entries')
            .update({
              clock_out: now.toISOString(),
              punch_out_method: 'auto_close',
              status: 'completed',
              notes: 'Auto-closed by system when new clock-in was attempted'
            })
            .in('id', entriesToClose.map(e => e.id));

          if (closeError) {
            console.error('[ClockIn] Error auto-closing entries:', closeError);
          }
        }

        // Check if there's still an active entry (created in last 30 min)
        const recentActiveEntry = existingEntries.find(entry => {
          const clockInTime = new Date(entry.clock_in);
          return clockInTime >= thirtyMinutesAgo && entry.status === 'active';
        });

        if (recentActiveEntry) {
          throw new Error('Employee clocked in less than 30 minutes ago. Please clock out first or contact supervisor.');
        }
      }

      // ========================================
      // CRITICAL: Validate punch against employee assignment
      // ========================================
      // Multi-dealer validation:
      // 1. Checks if employee has active assignment to this dealership
      // 2. Prevents employee from being clocked in at two dealerships simultaneously
      // 3. Validates punch time against assignment's schedule template
      // This server-side check cannot be bypassed by UI manipulation
      const currentTime = new Date().toISOString();

      const { data: validation, error: validationError } = await supabase.rpc('validate_punch_in_assignment', {
        p_employee_id: params.employeeId,
        p_dealership_id: params.dealershipId,
        p_kiosk_id: params.kioskId || null,
        p_punch_time: currentTime
      });

      if (validationError) {
        console.error('[ClockIn] Validation RPC error:', validationError);
        throw new Error('Failed to validate punch. Please contact support.');
      }

      if (validation && validation.length > 0 && !validation[0].allowed) {
        // Validation failed - block punch
        const reason = validation[0].reason || 'Clock in not allowed';
        console.warn('[ClockIn] Punch blocked by validation:', reason);
        throw new Error(reason);
      }

      console.log('[ClockIn] Validation passed - proceeding with punch');

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
          ip_address: params.ipAddress,
          schedule_id: params.scheduleId,
          notes: params.notes, // Employee note explaining punch
          // GPS location (for remote kiosk punches)
          punch_in_latitude: params.latitude,
          punch_in_longitude: params.longitude,
          punch_in_address: params.address,
          punch_in_accuracy: params.locationAccuracy,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[ClockIn] Successfully created new time entry:', data.id);
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
      kioskId?: string;
      ipAddress?: string;
      notes?: string; // Optional employee note explaining clock out
      // GPS location (required for remote kiosk punches)
      latitude?: number;
      longitude?: number;
      address?: string;
      locationAccuracy?: number;
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

      // ✅ AUTO-CLOSE OPEN BREAKS: Find any open breaks and close them automatically
      const clockOutTime = new Date();

      const { data: openBreaks } = await supabase
        .from('detail_hub_breaks')
        .select('id, break_start, break_number')
        .eq('time_entry_id', activeEntry.id)
        .is('break_end', null);

      if (openBreaks && openBreaks.length > 0) {
        console.warn('[AUTO-CLOSE] Found open breaks at clock out - auto-closing:', openBreaks.length);

        // Auto-close all open breaks
        for (const openBreak of openBreaks) {
          await supabase
            .from('detail_hub_breaks')
            .update({
              break_end: clockOutTime.toISOString(),
              // duration will be auto-calculated by trigger
            })
            .eq('id', openBreak.id);

          console.log(`[AUTO-CLOSE] Break #${openBreak.break_number} auto-closed at clock out`);
        }
      }

      // Update with clock out
      const { data, error} = await supabase
        .from('detail_hub_time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          punch_out_method: params.method || 'manual',
          photo_out_url: params.photoUrl,
          face_confidence_out: params.faceConfidence,
          kiosk_id: params.kioskId || activeEntry.kiosk_id,
          ip_address: params.ipAddress || activeEntry.ip_address,
          notes: params.notes ? (activeEntry.notes ? `${activeEntry.notes}\n[Clock Out] ${params.notes}` : `[Clock Out] ${params.notes}`) : activeEntry.notes,
          // GPS location (for remote kiosk punches)
          punch_out_latitude: params.latitude,
          punch_out_longitude: params.longitude,
          punch_out_address: params.address,
          punch_out_accuracy: params.locationAccuracy,
          status: 'complete',
          // Hours will be auto-calculated by database trigger
          // break_duration_minutes will be updated by detail_hub_breaks trigger (sum of all breaks)
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
      kioskId?: string;
      ipAddress?: string;
      notes?: string; // Optional employee note explaining break start
      // GPS location (required for remote kiosk punches)
      latitude?: number;
      longitude?: number;
      address?: string;
    }) => {
      // Find active time entry
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id, employee_id, dealership_id, clock_in, clock_out, status')
        .eq('employee_id', params.employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!activeEntry) throw new Error('No active time entry found. Please clock in first.');

      // ✅ NEW: Check for open breaks in detail_hub_breaks table
      const { data: openBreaks, error: openBreakError } = await supabase
        .from('detail_hub_breaks')
        .select('id, break_number')
        .eq('time_entry_id', activeEntry.id)
        .is('break_end', null)
        .limit(1);

      if (openBreakError) throw openBreakError;

      if (openBreaks && openBreaks.length > 0) {
        throw new Error('Break already in progress. Please end current break first.');
      }

      // ✅ NEW: INSERT into detail_hub_breaks table (supports multiple breaks)
      const { data: newBreak, error: insertError } = await supabase
        .from('detail_hub_breaks')
        .insert({
          time_entry_id: activeEntry.id,
          employee_id: params.employeeId,
          dealership_id: activeEntry.dealership_id,
          break_start: new Date().toISOString(),
          break_end: null,
          photo_start_url: params.photoUrl,
          kiosk_id: params.kioskId,
          notes: params.notes, // Employee note explaining break start
          // GPS location (for remote kiosk punches)
          break_start_latitude: params.latitude,
          break_start_longitude: params.longitude,
          break_start_address: params.address,
          // break_number will be auto-assigned by trigger
          // break_type will be auto-assigned by trigger (1='lunch', 2+='regular')
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // ✅ BACKWARD COMPATIBILITY: Also update time_entries (deprecated columns)
      // This keeps old code working during transition period
      await supabase
        .from('detail_hub_time_entries')
        .update({
          break_start: new Date().toISOString(),
          break_end: null,
          kiosk_id: params.kioskId || activeEntry.kiosk_id,
        })
        .eq('id', activeEntry.id);

      return newBreak;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      // ✅ CRITICAL FIX: Invalidate current break cache to refresh UI immediately
      queryClient.invalidateQueries({ queryKey: ['current_break'] });

      const breakNumber = (data as any).break_number || 1;
      const breakType = breakNumber === 1 ? 'Lunch Break' : `Break #${breakNumber}`;

      toast({
        title: "Break Started",
        description: `${breakType} started at ${new Date().toLocaleTimeString()}`,
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
      kioskId?: string;
      ipAddress?: string;
      notes?: string; // Optional employee note explaining break end
      // GPS location (required for remote kiosk punches)
      latitude?: number;
      longitude?: number;
      address?: string;
    }) => {
      // Find active time entry
      const { data: activeEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id, employee_id, dealership_id, status')
        .eq('employee_id', params.employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!activeEntry) throw new Error('No active time entry found. Please clock in first.');

      // ✅ NEW: Find open break in detail_hub_breaks table
      const { data: openBreak, error: openBreakError } = await supabase
        .from('detail_hub_breaks')
        .select('id, break_number, break_start, employee_id, notes')
        .eq('time_entry_id', activeEntry.id)
        .is('break_end', null)
        .maybeSingle();

      if (openBreakError) throw openBreakError;
      if (!openBreak) throw new Error('No break in progress');

      // Calculate break duration
      const breakStart = new Date(openBreak.break_start);
      const breakEnd = new Date();
      const breakDurationMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);

      // ✅ SMART VALIDATION: Only validate first break (lunch break)
      if (openBreak.break_number === 1) {
        // Get employee's required break minimum from their schedule template
        const { data: employee } = await supabase
          .from('detail_hub_employees')
          .select('template_break_minutes')
          .eq('id', params.employeeId)
          .single();

        const requiredMinimum = employee?.template_break_minutes || 30;

        if (breakDurationMinutes < requiredMinimum) {
          throw new Error(`First break (lunch) must be at least ${requiredMinimum} minutes. Current: ${breakDurationMinutes} min. Please wait ${requiredMinimum - breakDurationMinutes} more minutes.`);
        }
      }
      // ✅ Subsequent breaks (break_number > 1) → NO VALIDATION (free duration)

      // ✅ NEW: Update break in detail_hub_breaks table
      const { data: updatedBreak, error: updateError } = await supabase
        .from('detail_hub_breaks')
        .update({
          break_end: breakEnd.toISOString(),
          photo_end_url: params.photoUrl,
          notes: params.notes ? (openBreak.notes ? `${openBreak.notes}\n[Break End] ${params.notes}` : `[Break End] ${params.notes}`) : openBreak.notes,
          // GPS location (for remote kiosk punches)
          break_end_latitude: params.latitude,
          break_end_longitude: params.longitude,
          break_end_address: params.address,
          // duration_minutes will be auto-calculated by trigger
        })
        .eq('id', openBreak.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // ✅ BACKWARD COMPATIBILITY: Also update time_entries (deprecated columns)
      // This keeps old code working during transition period
      await supabase
        .from('detail_hub_time_entries')
        .update({
          break_end: breakEnd.toISOString(),
          // break_duration_minutes will be updated by detail_hub_breaks trigger
        })
        .eq('id', activeEntry.id);

      return updatedBreak;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      // ✅ CRITICAL FIX: Invalidate current break cache to refresh UI immediately
      queryClient.invalidateQueries({ queryKey: ['current_break'] });

      const breakType = data.break_number === 1 ? 'Lunch break' : `Break #${data.break_number}`;
      const duration = data.duration_minutes || 0;

      toast({
        title: "Break Ended",
        description: `${breakType} ended. Duration: ${duration} minutes`,
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
// BREAKS QUERIES (Multiple Breaks Support)
// =====================================================

export interface DetailHubBreak {
  id: string;
  time_entry_id: string;
  employee_id: string;
  break_number: number;
  break_start: string;
  break_end: string | null;
  duration_minutes: number | null;
  break_type: string;
  is_paid: boolean;
  photo_start_url: string | null;
  photo_end_url: string | null;
  kiosk_id: string | null;
  created_at: string;
}

/**
 * Fetch all breaks for a specific time entry
 * Used to display multiple breaks in UI
 */
export function useEmployeeBreaks(timeEntryId: string | null) {
  return useQuery({
    queryKey: ['detail_hub_breaks', timeEntryId],
    queryFn: async () => {
      if (!timeEntryId) return [];

      const { data, error } = await supabase
        .from('detail_hub_breaks')
        .select('*')
        .eq('time_entry_id', timeEntryId)
        .order('break_number', { ascending: true });

      if (error) throw error;
      return (data || []) as DetailHubBreak[];
    },
    enabled: !!timeEntryId,
    staleTime: 1000 * 60, // 1 minute (breaks don't change frequently)
  });
}

/**
 * Get current open break for an employee (if any)
 * Used to show "Break in progress" status
 */
export function useCurrentBreak(employeeId: string | null) {
  return useQuery({
    queryKey: ['current_break', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      // First get active time entry
      const { data: activeEntry } = await supabase
        .from('detail_hub_time_entries')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (!activeEntry) return null;

      // Then get open break
      const { data, error } = await supabase
        .from('detail_hub_breaks')
        .select('*')
        .eq('time_entry_id', activeEntry.id)
        .is('break_end', null)
        .maybeSingle();

      if (error) throw error;
      return data as DetailHubBreak | null;
    },
    enabled: !!employeeId,
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });
}

// =====================================================
// INDIVIDUAL BREAK CRUD OPERATIONS
// =====================================================

/**
 * Update an existing break (edit start/end times, break type)
 * Used for editing individual breaks in time entry detail view
 */
export function useUpdateBreak() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (params: {
      breakId: string;
      breakStart?: string;
      breakEnd?: string;
      breakType?: string;
    }) => {
      const updates: any = {};

      if (params.breakStart !== undefined) updates.break_start = params.breakStart;
      if (params.breakEnd !== undefined) updates.break_end = params.breakEnd;
      if (params.breakType !== undefined) updates.break_type = params.breakType;

      const { data, error } = await supabase
        .from('detail_hub_breaks')
        .update(updates)
        .eq('id', params.breakId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubBreak;
    },
    onSuccess: (data) => {
      // Invalidate breaks for this time entry
      queryClient.invalidateQueries({ queryKey: ['detail_hub_breaks', data.time_entry_id] });
      // Invalidate time entries to refresh hours calculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      // Invalidate current break cache
      queryClient.invalidateQueries({ queryKey: ['current_break'] });

      toast({
        title: "Break Updated",
        description: `Break #${data.break_number} has been updated successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update break',
        variant: "destructive"
      });
    }
  });
}

/**
 * End an active break by break ID (quick action)
 * Used for "End Now" button functionality
 */
export function useEndBreakById() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (params: {
      breakId: string;
      breakEnd?: string; // Optional, defaults to now
    }) => {
      const breakEndTime = params.breakEnd || new Date().toISOString();

      const { data, error } = await supabase
        .from('detail_hub_breaks')
        .update({
          break_end: breakEndTime,
          // duration_minutes will be auto-calculated by trigger
        })
        .eq('id', params.breakId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubBreak;
    },
    onSuccess: (data) => {
      // Invalidate breaks for this time entry
      queryClient.invalidateQueries({ queryKey: ['detail_hub_breaks', data.time_entry_id] });
      // Invalidate time entries to refresh hours calculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      // Invalidate current break cache
      queryClient.invalidateQueries({ queryKey: ['current_break'] });

      const breakType = data.break_number === 1 ? 'Lunch break' : `Break #${data.break_number}`;
      const duration = data.duration_minutes || 0;

      toast({
        title: "Break Ended",
        description: `${breakType} ended. Duration: ${duration} minutes`
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

/**
 * Delete a break record
 * Removes break from time entry and recalculates hours
 */
export function useDeleteBreak() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (params: {
      breakId: string;
      timeEntryId: string;
    }) => {
      const { error } = await supabase
        .from('detail_hub_breaks')
        .delete()
        .eq('id', params.breakId);

      if (error) throw error;
      return params;
    },
    onSuccess: (params) => {
      // Invalidate breaks for this time entry
      queryClient.invalidateQueries({ queryKey: ['detail_hub_breaks', params.timeEntryId] });
      // Invalidate time entries to refresh hours calculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });
      // Invalidate current break cache
      queryClient.invalidateQueries({ queryKey: ['current_break'] });

      toast({
        title: "Break Deleted",
        description: "Break has been removed and hours have been recalculated."
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete break',
        variant: "destructive"
      });
    }
  });
}

/**
 * Add a new break to an existing time entry
 * Supports multiple breaks per entry
 */
export function useAddBreak() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (params: {
      timeEntryId: string;
      employeeId: string;
      dealershipId: number;
      breakStart: string;
      breakEnd?: string;
      breakType?: string;
    }) => {
      const { data, error } = await supabase
        .from('detail_hub_breaks')
        .insert({
          time_entry_id: params.timeEntryId,
          employee_id: params.employeeId,
          dealership_id: params.dealershipId,
          break_start: params.breakStart,
          break_end: params.breakEnd || null,
          break_type: params.breakType || 'regular',
          // break_number will be auto-assigned by trigger
          // duration_minutes will be auto-calculated by trigger if break_end provided
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubBreak;
    },
    onSuccess: (data) => {
      // Invalidate breaks for this time entry
      queryClient.invalidateQueries({ queryKey: ['detail_hub_breaks', data.time_entry_id] });
      // Invalidate time entries to refresh hours calculation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Break Added",
        description: `Break #${data.break_number} has been added successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Add Failed",
        description: error instanceof Error ? error.message : 'Failed to add break',
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
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Check if the manual entry is for today
      const clockInDate = new Date(params.clockIn);
      const today = new Date();
      const isToday = clockInDate.toDateString() === today.toDateString();
      const isFuture = clockInDate > today;

      // Only validate active entries if the manual entry is for today or future
      if (isToday || isFuture) {
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
      }

      // Validation: Check for overlapping entries (EXCLUDE disabled and deleted entries)
      if (params.clockOut) {
        const { data: overlapping } = await supabase
          .from('detail_hub_time_entries')
          .select('id, status, deleted_at')
          .eq('employee_id', params.employeeId)
          .neq('status', 'disabled') // ✅ CRITICAL FIX: Exclude disabled entries
          .is('deleted_at', null) // ✅ CRITICAL FIX: Exclude soft-deleted entries
          .or(`and(clock_in.lte.${params.clockOut},clock_out.gte.${params.clockIn})`)
          .limit(1);

        if (overlapping && overlapping.length > 0) {
          throw new Error('Time entry overlaps with existing entry for this employee.');
        }
      }

      // Create manual time entry (NO LEGACY BREAK FIELDS)
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .insert({
          employee_id: params.employeeId,
          dealership_id: params.dealershipId,
          clock_in: params.clockIn,
          clock_out: params.clockOut || null,
          punch_in_method: 'manual',
          punch_out_method: params.clockOut ? 'manual' : null,
          requires_manual_verification: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          status: params.clockOut ? 'complete' : 'active',
          notes: params.notes || null
          // break_duration_minutes will be auto-calculated by trigger when breaks are added
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
// EMPLOYEE AUDIT LOGS
// =====================================================

export interface EmployeeAuditLog {
  id: string;
  employee_id: string;
  action_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'role_changed' | 'pin_reset' | 'face_enrolled';
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

export function useEmployeeAuditLogs(employeeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee_audit_logs', employeeId],
    queryFn: async () => {
      if (!user || !employeeId) return [];

      const { data, error } = await supabase
        .from('detail_hub_employee_audit')
        .select(`
          *,
          user:profiles!detail_hub_employee_audit_changed_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: true }); // Chronological order

      if (error) throw error;
      return data as EmployeeAuditLog[];
    },
    enabled: !!user && !!employeeId,
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
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Fetch current time entry to check if we're adding clock out and approval status
      const { data: currentEntry, error: fetchError } = await supabase
        .from('detail_hub_time_entries')
        .select('id, clock_out, status, approval_status')
        .eq('id', params.timeEntryId)
        .single();

      if (fetchError) throw fetchError;

      const updates: any = {
        verified_by: user.id, // Track who made the edit
        updated_at: new Date().toISOString()
      };

      // 🔄 APPROVAL RESET: If entry was approved/rejected, reset to pending
      if (currentEntry.approval_status && currentEntry.approval_status !== 'pending') {
        console.log(`[TIMECARD EDIT] Entry ${params.timeEntryId} was ${currentEntry.approval_status}, resetting to pending`);
        updates.approval_status = 'pending';
        updates.approved_by = null;
        updates.approved_at = null;
      }

      if (params.clockIn) updates.clock_in = params.clockIn;
      if (params.clockOut !== undefined) updates.clock_out = params.clockOut || null;
      if (params.notes !== undefined) updates.notes = params.notes || null;

      // If adding clock out to an active entry, update status and punch method
      const isAddingClockOut = !currentEntry.clock_out && params.clockOut;
      if (isAddingClockOut) {
        updates.status = 'complete';
        updates.punch_out_method = 'manual';

        // Auto-close any open breaks
        const { data: openBreaks } = await supabase
          .from('detail_hub_breaks')
          .select('id, break_number')
          .eq('time_entry_id', params.timeEntryId)
          .is('break_end', null);

        if (openBreaks && openBreaks.length > 0) {
          console.warn(`[MANUAL CLOCK OUT] Auto-closing ${openBreaks.length} open breaks for time entry ${params.timeEntryId}`);

          for (const openBreak of openBreaks) {
            await supabase
              .from('detail_hub_breaks')
              .update({ break_end: params.clockOut })
              .eq('id', openBreak.id);

            console.log(`[MANUAL CLOCK OUT] Break #${openBreak.break_number} auto-closed`);
          }
        }
      }

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
      // Also invalidate breaks to refresh break-related data
      queryClient.invalidateQueries({ queryKey: ['detail_hub_breaks'] });

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

// =====================================================
// EARLY PUNCH APPROVAL SYSTEM
// =====================================================

/**
 * Approve an early punch for a time entry
 * Marks the early clock-in as supervisor-approved
 */
export function useApproveEarlyPunch() {
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          early_punch_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['detail-hub', 'currently-working'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Early Punch Approved",
        description: "The early clock-in has been approved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : 'Failed to approve early punch',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// TEMPLATE-BASED PUNCH VALIDATION (REPLACES SCHEDULES)
// =====================================================

export interface TemplateValidationResult {
  allowed: boolean;
  reason: string;
  assignment_id: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  early_punch_allowed_minutes: number | null;
  late_punch_grace_minutes: number | null;
  minutes_until_allowed: number | null;
  require_face_validation: boolean;
}

/**
 * Validates punch-in using employee assignment and schedule template
 * Uses validate_punch_in_assignment RPC function
 */
export function useTemplateValidation(
  employeeId: string | null,
  kioskId: string | null,
  dealershipId?: number | null
) {
  return useQuery({
    queryKey: ['template-validation', employeeId, kioskId, dealershipId],
    queryFn: async () => {
      if (!employeeId || !dealershipId || dealershipId === 0) return null;

      const punchTime = new Date().toISOString();
      console.log('[TemplateValidation] Calling RPC with:', {
        p_employee_id: employeeId,
        p_dealership_id: dealershipId,
        p_kiosk_id: kioskId || null,
        p_punch_time: punchTime,
        local_time: new Date().toLocaleTimeString()
      });

      const { data, error } = await supabase.rpc('validate_punch_in_assignment', {
        p_employee_id: employeeId,
        p_dealership_id: dealershipId,
        p_kiosk_id: kioskId || null,
        p_punch_time: punchTime
      });

      console.log('[TemplateValidation] RPC response:', { data, error });

      if (error) {
        console.error('[TemplateValidation] RPC error:', error);
        throw error;
      }

      // Transform result to match expected interface
      const result = data?.[0];
      console.log('[TemplateValidation] Result:', result);
      if (!result) return null;

      return {
        allowed: result.allowed,
        reason: result.reason,
        assignment_id: result.assignment_id,
        // Now these fields are returned from the expanded RPC
        shift_start_time: result.shift_start_time || null,
        shift_end_time: result.shift_end_time || null,
        early_punch_allowed_minutes: result.early_punch_allowed_minutes || null,
        late_punch_grace_minutes: result.late_punch_grace_minutes || null,
        minutes_until_allowed: result.minutes_until_allowed || null,
        require_face_validation: result.require_face_validation || false,
      } as TemplateValidationResult;
    },
    enabled: !!employeeId && !!dealershipId && dealershipId !== 0,
    staleTime: 10000, // 10 seconds
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 10000, // Refresh every 10s for better responsiveness
  });
}

// =====================================================
// SUPERVISOR OVERRIDE SYSTEM
// =====================================================

/**
 * Allow supervisor to override schedule validation and clock in employee
 * Creates a temporary "walk-in" schedule for tracking
 * SAFE: Does not bypass security, only schedule validation
 */
export function useSupervisorOverridePunch() {
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      kioskId: string;
      reason: string;
    }) => {
      if (!user) throw new Error('No authenticated user');

      // Call supervisor override function
      const { data, error } = await supabase.rpc('allow_supervisor_override', {
        p_employee_id: params.employeeId,
        p_kiosk_id: params.kioskId,
        p_supervisor_id: user.id,
        p_reason: params.reason
      });

      if (error) throw error;

      const result = data[0];
      if (!result.allowed) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['detail-hub', 'currently-working'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Override Approved",
        description: data.message || "Walk-in schedule created successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Override Failed",
        description: error instanceof Error ? error.message : 'Failed to override schedule validation',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// TIMECARD APPROVAL SYSTEM (NEW)
// =====================================================

/**
 * Approve a timecard entry
 * Permissions: Only system_admin and supermanager can approve
 */
export function useApproveTimecard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Permission check is done in EmployeeTimecardDetailModal UI
      // This is an additional safety check
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'system_admin' && profile?.role !== 'supermanager') {
        throw new Error('Insufficient permissions. Only system administrators and supermanagers can approve timecards.');
      }

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null // Clear any previous rejection reason
        })
        .eq('id', timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Timecard Approved",
        description: "The timecard entry has been approved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : 'Failed to approve timecard',
        variant: "destructive"
      });
    }
  });
}

/**
 * Reject a timecard entry
 * Permissions: Only system_admin and supermanager can reject
 * Uses soft delete (marks as rejected, not physical deletion)
 */
export function useRejectTimecard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      timeEntryId: string;
      reason: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Permission check
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'system_admin' && profile?.role !== 'supermanager') {
        throw new Error('Insufficient permissions. Only system administrators and supermanagers can reject timecards.');
      }

      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: params.reason
        })
        .eq('id', params.timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubTimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Timecard Rejected",
        description: "The timecard entry has been rejected.",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : 'Failed to reject timecard',
        variant: "destructive"
      });
    }
  });
}

/**
 * Approve multiple timecard entries at once (bulk action)
 * Permissions: Only system_admin and supermanager can approve
 */
export function useBulkApproveTimecards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (timeEntryIds: string[]) => {
      if (!user) throw new Error('User not authenticated');

      // Permission check
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'system_admin' && profile?.role !== 'supermanager') {
        throw new Error('Insufficient permissions. Only system administrators and supermanagers can approve timecards.');
      }

      const approvalTime = new Date().toISOString();

      // Update all entries in a single transaction-like batch
      const { data, error } = await supabase
        .from('detail_hub_time_entries')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: approvalTime,
          rejection_reason: null
        })
        .in('id', timeEntryIds)
        .select();

      if (error) throw error;
      return data as DetailHubTimeEntry[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntries(selectedDealerId) });

      toast({
        title: "Bulk Approval Complete",
        description: `${data.length} timecard ${data.length === 1 ? 'entry' : 'entries'} approved successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Approval Failed",
        description: error instanceof Error ? error.message : 'Failed to approve timecards',
        variant: "destructive"
      });
    }
  });
}
