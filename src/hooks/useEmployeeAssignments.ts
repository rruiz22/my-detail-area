/**
 * Employee Assignment Hooks
 *
 * Manages multi-dealer employee assignments with per-dealer schedule templates.
 * Allows employees to work across multiple dealerships with different schedules.
 *
 * @module useEmployeeAssignments
 */

import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

// =====================================================
// TYPES
// =====================================================

/**
 * Schedule template for an employee assignment
 * Defines when and how an employee can work at a specific dealership
 */
export interface ScheduleTemplate {
  /** Shift start time (HH:MM format, e.g., "08:00") */
  shift_start_time?: string;

  /** Shift end time (HH:MM format, e.g., "17:00") */
  shift_end_time?: string;

  /** Days of week allowed to work (0=Sunday, 6=Saturday) */
  days_of_week?: number[];

  /** Minutes before shift start that early punch-in is allowed */
  early_punch_allowed_minutes?: number;

  /** Minutes after shift start that late punch-in is allowed */
  late_punch_grace_minutes?: number;

  /** Required break duration in minutes */
  required_break_minutes?: number;

  /** Whether break is paid */
  break_is_paid?: boolean;

  /** Assigned kiosk ID for this assignment */
  assigned_kiosk_id?: string | null;

  /** Enable auto-close for forgotten punch-outs (default: false) */
  auto_close_enabled?: boolean;

  /** Minutes after shift end to send first reminder (default: 30) */
  auto_close_first_reminder?: number;

  /** Minutes after shift end to send second reminder (default: 60) */
  auto_close_second_reminder?: number;

  /** Minutes after shift end to auto-close punch (default: 120) */
  auto_close_window_minutes?: number;

  /** Whether to require face validation for this assignment */
  require_face_validation?: boolean;
}

/**
 * Employee assignment to a dealership
 * Represents a many-to-many relationship between employees and dealerships
 */
export interface EmployeeAssignment {
  id: string;
  employee_id: string;
  dealership_id: number;

  /** Schedule template specific to this dealership */
  schedule_template: ScheduleTemplate;

  /** Whether to auto-generate schedules for this assignment */
  auto_generate_schedules: boolean;

  /** How many days ahead to generate schedules */
  schedule_generation_days_ahead: number;

  /** Assignment status */
  status: 'active' | 'inactive' | 'suspended';

  /** When the assignment was created */
  assigned_at: string;

  /** Who created the assignment */
  assigned_by: string | null;

  /** Optional notes about the assignment */
  notes: string | null;

  /** Audit timestamps */
  created_at: string;
  updated_at: string;
}

/**
 * Employee assignment with populated dealership data
 */
export interface EmployeeAssignmentWithDealer extends EmployeeAssignment {
  dealership: {
    id: number;
    name: string;
    logo_url: string | null;
  };
}

/**
 * Data required to create a new assignment
 */
export interface CreateAssignmentData {
  employee_id: string;
  dealership_id: number;
  schedule_template?: ScheduleTemplate;
  auto_generate_schedules?: boolean;
  schedule_generation_days_ahead?: number;
  notes?: string;
}

/**
 * Data for updating an existing assignment
 */
export interface UpdateAssignmentData {
  schedule_template?: ScheduleTemplate;
  auto_generate_schedules?: boolean;
  schedule_generation_days_ahead?: number;
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

// =====================================================
// QUERY KEYS
// =====================================================

const ASSIGNMENT_QUERY_KEYS = {
  /** All assignments for an employee */
  byEmployee: (employeeId: string | null) =>
    ['employee-assignments', 'by-employee', employeeId] as const,

  /** All assignments for a dealership */
  byDealership: (dealershipId: number | 'all') =>
    ['employee-assignments', 'by-dealership', dealershipId] as const,

  /** Single assignment by ID */
  single: (assignmentId: string) =>
    ['employee-assignments', 'single', assignmentId] as const,
} as const;

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all assignments for a specific employee
 * Includes dealership details (name, logo) via join
 *
 * @param employeeId - Employee UUID
 * @returns Query result with employee assignments
 *
 * @example
 * ```tsx
 * const { data: assignments } = useEmployeeAssignments(employee.id);
 *
 * assignments?.map(a => (
 *   <Badge key={a.id}>{a.dealership.name}</Badge>
 * ))
 * ```
 */
export function useEmployeeAssignments(employeeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(employeeId),
    queryFn: async () => {
      if (!user || !employeeId) throw new Error('Missing authentication or employee ID');

      const { data, error } = await supabase
        .from('detail_hub_employee_assignments')
        .select(`
          *,
          dealership:dealerships(id, name, logo_url)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeAssignmentWithDealer[];
    },
    enabled: !!user && !!employeeId,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

/**
 * Get all assignments for a specific dealership
 * Useful for seeing all employees assigned to a location
 *
 * @param dealershipId - Dealership ID or 'all'
 * @returns Query result with assignments
 */
export function useDealershipAssignments(dealershipId: number | 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.byDealership(dealershipId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_employee_assignments')
        .select(`
          *,
          employee:detail_hub_employees(
            id,
            employee_number,
            first_name,
            last_name,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (dealershipId !== 'all') {
        query = query.eq('dealership_id', dealershipId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new employee-dealership assignment
 *
 * @returns Mutation object with createAssignment function
 *
 * @example
 * ```tsx
 * const { mutate: createAssignment } = useCreateAssignment();
 *
 * createAssignment({
 *   employee_id: employee.id,
 *   dealership_id: dealer.id,
 *   schedule_template: {
 *     shift_start_time: '08:00',
 *     shift_end_time: '17:00',
 *     early_punch_allowed_minutes: 15,
 *     late_punch_grace_minutes: 15
 *   }
 * });
 * ```
 */
export function useCreateAssignment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignmentData: CreateAssignmentData) => {
      if (!user) throw new Error('User not authenticated');

      // Check for existing assignment to prevent duplicate key violation
      // Using maybeSingle() to avoid error if not found
      const { data: existing } = await supabase
        .from('detail_hub_employee_assignments')
        .select('id')
        .eq('employee_id', assignmentData.employee_id)
        .eq('dealership_id', assignmentData.dealership_id)
        .maybeSingle();

      if (existing) {
        // Throw error with translation key that will be caught by onError
        throw new Error('detail_hub.assignments.toast.already_assigned');
      }

      const { data, error } = await supabase
        .from('detail_hub_employee_assignments')
        .insert({
          employee_id: assignmentData.employee_id,
          dealership_id: assignmentData.dealership_id,
          schedule_template: assignmentData.schedule_template || {},
          auto_generate_schedules: assignmentData.auto_generate_schedules ?? false,
          schedule_generation_days_ahead: assignmentData.schedule_generation_days_ahead ?? 30,
          notes: assignmentData.notes,
          assigned_by: user.id,
          status: 'active',
        })
        .select(`
          *,
          dealership:dealerships(id, name, logo_url)
        `)
        .single();

      if (error) throw error;
      return data as EmployeeAssignmentWithDealer;
    },
    onMutate: async (assignmentData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(assignmentData.employee_id)
      });

      // Snapshot previous value for rollback
      const previousAssignments = queryClient.getQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(assignmentData.employee_id)
      );

      // Optimistically update UI with temporary assignment
      queryClient.setQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(assignmentData.employee_id),
        (old: EmployeeAssignmentWithDealer[] | undefined) => {
          if (!old) return old;

          // Create optimistic assignment with temp ID
          const optimisticAssignment: EmployeeAssignmentWithDealer = {
            id: `temp-${Date.now()}`,
            employee_id: assignmentData.employee_id,
            dealership_id: assignmentData.dealership_id,
            schedule_template: assignmentData.schedule_template || {},
            auto_generate_schedules: assignmentData.auto_generate_schedules ?? false,
            schedule_generation_days_ahead: assignmentData.schedule_generation_days_ahead ?? 30,
            status: 'active',
            assigned_at: new Date().toISOString(),
            assigned_by: user?.id || null,
            notes: assignmentData.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            dealership: {
              id: assignmentData.dealership_id,
              name: 'Loading...',
              logo_url: null
            }
          };

          return [optimisticAssignment, ...old];
        }
      );

      return { previousAssignments };
    },
    onSuccess: (data) => {
      // Invalidate employee's assignments
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(data.employee_id)
      });

      // Invalidate dealership's assignments
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byDealership(data.dealership_id)
      });

      toast({
        title: t('detail_hub.assignments.toast.created_title'),
        description: t('detail_hub.assignments.toast.created_description', {
          dealership: data.dealership.name
        })
      });
    },
    onError: (error, assignmentData, context) => {
      console.error('Create assignment error:', error);

      // Rollback optimistic update
      if (context?.previousAssignments) {
        queryClient.setQueryData(
          ASSIGNMENT_QUERY_KEYS.byEmployee(assignmentData.employee_id),
          context.previousAssignments
        );
      }

      // Check if error message is a translation key
      let errorMessage = t('detail_hub.assignments.toast.error_create');
      if (error instanceof Error) {
        // If message starts with translation namespace, translate it
        if (error.message.startsWith('detail_hub.')) {
          errorMessage = t(error.message);
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: t('detail_hub.assignments.toast.error_title'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
}

/**
 * Update an existing employee assignment
 *
 * @returns Mutation object with updateAssignment function
 *
 * @example
 * ```tsx
 * const { mutate: updateAssignment } = useUpdateAssignment();
 *
 * updateAssignment({
 *   assignmentId: assignment.id,
 *   updates: {
 *     schedule_template: {
 *       shift_start_time: '09:00',
 *       shift_end_time: '18:00'
 *     }
 *   }
 * });
 * ```
 */
export function useUpdateAssignment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      updates
    }: {
      assignmentId: string;
      updates: UpdateAssignmentData
    }) => {
      const { data, error } = await supabase
        .from('detail_hub_employee_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select(`
          *,
          dealership:dealerships(id, name, logo_url)
        `)
        .single();

      if (error) throw error;
      return data as EmployeeAssignmentWithDealer;
    },
    onMutate: async ({ assignmentId, updates }) => {
      // Get current assignment to find employee_id
      const currentAssignment = queryClient.getQueriesData({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(null as any)
      }).flatMap(([, data]) => data as EmployeeAssignmentWithDealer[] || [])
        .find(a => a.id === assignmentId);

      if (!currentAssignment) return {};

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id)
      });

      // Snapshot previous value
      const previousAssignments = queryClient.getQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id)
      );

      // Optimistically update UI
      queryClient.setQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id),
        (old: EmployeeAssignmentWithDealer[] | undefined) => {
          if (!old) return old;

          return old.map(assignment =>
            assignment.id === assignmentId
              ? { ...assignment, ...updates, updated_at: new Date().toISOString() }
              : assignment
          );
        }
      );

      return { previousAssignments, employeeId: currentAssignment.employee_id };
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(data.employee_id)
      });
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byDealership(data.dealership_id)
      });
      // Toast handled by parent component to avoid duplicates when updating multiple assignments
    },
    onError: (error, variables, context) => {
      console.error('Update assignment error:', error);

      // Rollback optimistic update
      if (context?.previousAssignments && context?.employeeId) {
        queryClient.setQueryData(
          ASSIGNMENT_QUERY_KEYS.byEmployee(context.employeeId),
          context.previousAssignments
        );
      }

      toast({
        title: t('detail_hub.assignments.toast.error_title'),
        description: error instanceof Error ? error.message : t('detail_hub.assignments.toast.error_update'),
        variant: "destructive"
      });
    }
  });
}

/**
 * Delete (remove) an employee-dealership assignment
 *
 * @returns Mutation object with deleteAssignment function
 *
 * @example
 * ```tsx
 * const { mutate: deleteAssignment } = useDeleteAssignment();
 *
 * deleteAssignment(assignment.id);
 * ```
 */
export function useDeleteAssignment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      // Atomic DELETE with RETURNING clause to avoid race condition
      // Previously: SELECT then DELETE (2 queries, race condition possible)
      // Now: DELETE with .select() uses PostgreSQL RETURNING (1 atomic query)
      const { data, error } = await supabase
        .from('detail_hub_employee_assignments')
        .delete()
        .eq('id', assignmentId)
        .select('employee_id, dealership_id')
        .single();

      if (error) throw error;

      // If data is null, assignment doesn't exist (or was already deleted)
      if (!data) {
        throw new Error('Assignment not found or already deleted');
      }

      return data;
    },
    onMutate: async (assignmentId) => {
      // Get current assignment to find employee_id before deletion
      const currentAssignment = queryClient.getQueriesData({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(null as any)
      }).flatMap(([, data]) => data as EmployeeAssignmentWithDealer[] || [])
        .find(a => a.id === assignmentId);

      if (!currentAssignment) return {};

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id)
      });

      // Snapshot previous value
      const previousAssignments = queryClient.getQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id)
      );

      // Optimistically remove assignment from UI
      queryClient.setQueryData(
        ASSIGNMENT_QUERY_KEYS.byEmployee(currentAssignment.employee_id),
        (old: EmployeeAssignmentWithDealer[] | undefined) => {
          if (!old) return old;
          return old.filter(assignment => assignment.id !== assignmentId);
        }
      );

      return {
        previousAssignments,
        employeeId: currentAssignment.employee_id,
        dealershipId: currentAssignment.dealership_id
      };
    },
    onSuccess: (assignment) => {
      if (assignment) {
        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: ASSIGNMENT_QUERY_KEYS.byEmployee(assignment.employee_id)
        });
        queryClient.invalidateQueries({
          queryKey: ASSIGNMENT_QUERY_KEYS.byDealership(assignment.dealership_id)
        });
      }

      toast({
        title: t('detail_hub.assignments.toast.deleted_title'),
        description: t('detail_hub.assignments.toast.deleted_description')
      });
    },
    onError: (error, assignmentId, context) => {
      console.error('Delete assignment error:', error);

      // Rollback optimistic update
      if (context?.previousAssignments && context?.employeeId) {
        queryClient.setQueryData(
          ASSIGNMENT_QUERY_KEYS.byEmployee(context.employeeId),
          context.previousAssignments
        );
      }

      toast({
        title: t('detail_hub.assignments.toast.error_title'),
        description: error instanceof Error ? error.message : t('detail_hub.assignments.toast.error_delete'),
        variant: "destructive"
      });
    }
  });
}
