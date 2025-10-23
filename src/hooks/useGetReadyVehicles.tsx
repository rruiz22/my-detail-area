import { useEffect } from 'react';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import { calculateDIS, calculateDTF, calculateT2L } from '@/utils/timeFormatUtils';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetReadyStore, type ReconVehicle } from './useGetReadyStore';
import type { GetReadyWorkItemSummary, VehicleDatabaseResponse, VehicleSortField } from '@/types/getReady';
import { validateDealershipObject } from '@/utils/dealerValidation';

// Type definition for vehicle detail
export interface VehicleDetail {
  id: string;
  stock_number: string;
  vin: string;
  short_vin: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim: string;
  mileage: number;
  color: string;
  priority: string;
  status: string;
  step_name: string;
  step_color: string;
  days_in_inventory: string;
  estimated_completion: string;
  notes: string;
  location: string;
  technician: string;
  work_orders: unknown[]; // TODO: Define WorkOrder type if needed
  current_step?: {
    name: string;
    color: string;
    order_index: number;
  };
}

export function useOverviewTable() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);
  const { searchTerm, priorityFilter, statusFilter } = useGetReadyStore();

  return useOrderPolling(
    ['get-ready-vehicles', 'overview', currentDealership?.id, searchTerm, priorityFilter, statusFilter],
    async (): Promise<ReconVehicle[]> => {
      if (!dealerId) {
        console.warn('No dealership selected for vehicle query');
        return [];
      }

      // Build query with joins
      let query = supabase
        .from('get_ready_vehicles')
        .select(`
          id,
          stock_number,
          vin,
          vehicle_year,
          vehicle_make,
          vehicle_model,
          vehicle_trim,
          status,
          priority,
          notes,
          created_at,
          intake_date,
          step_id,
          get_ready_steps!inner (
            name,
            color,
            order_index
          ),
          get_ready_work_items (
            id,
            title,
            description,
            status,
            approval_required,
            approval_status
          )
        `)
        .eq('dealer_id', dealerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        const sanitized = term.replace(/\/g, '\\').replace(/%/g, '\%').replace(_/g, '\_');
        // Sanitize search sanitized to prevent wildcard bypass
        const sanitized = term
          .replace(/\/g, '\\')  // Escape backslash first
          .replace(/%/g, '\%')        // Escape percent wildcard
          .replace(/_/g, '\_');       // Escape underscore wildcard
        query = query.or(`stock_number.ilike.%${term}%,vin.ilike.%${term}%,vehicle_make.ilike.%${term}%,vehicle_model.ilike.%${term}%`);
      }

      if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw error;
      }

      if (!data) return [];

      // Transform data to ReconVehicle format
      return data.map((vehicle: VehicleDatabaseResponse) => {
        // Calculate work items counts by status
        const workItems = vehicle.get_ready_work_items || [];
        const work_item_counts = {
          pending: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'pending').length,
          in_progress: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'in_progress').length,
          completed: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'completed').length,
          declined: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'declined').length,
        };

        return {
          id: vehicle.id,
          stock_number: vehicle.stock_number,
          vin: vehicle.vin,
          short_vin: vehicle.vin.slice(-6),
          vehicle_year: vehicle.vehicle_year,
          vehicle_make: vehicle.vehicle_make,
          vehicle_model: vehicle.vehicle_model,
          vehicle_trim: vehicle.vehicle_trim || '',
          current_step_name: vehicle.get_ready_steps?.name || 'Unknown',
          current_step_color: vehicle.get_ready_steps?.color || '#6B7280',
          current_step_order: vehicle.get_ready_steps?.order_index || 0,
          status: vehicle.status,
          priority: vehicle.priority,
          days_in_step: calculateDaysInStep(vehicle.intake_date),
          media_count: 0, // TODO: Add media count when media table is implemented
          work_item_counts,
          notes_preview: vehicle.notes ? vehicle.notes.slice(0, 50) : '',
          retail_value: 0, // TODO: Add retail value when field is added
          created_at: vehicle.created_at,
        };
      });
    },
    !!currentDealership?.id
  );
}

// Helper function to calculate days in step
function calculateDaysInStep(intakeDate: string): string {
  const intake = new Date(intakeDate);
  const now = new Date();
  const diffInMs = now.getTime() - intake.getTime();
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function useVehicleDetail(vehicleId: string | null) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useQuery<VehicleDetail | null>({
    queryKey: ['get-ready-vehicle-detail', vehicleId, currentDealership?.id],
    queryFn: async () => {
      if (!vehicleId || !dealerId) return null;

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .select(`
          *,
          get_ready_steps (
            name,
            color,
            order_index
          )
        `)
        .eq('id', vehicleId)
        .eq('dealer_id', dealerId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Error fetching vehicle detail:', error);
        throw error;
      }

      if (!data) return null;

      const currentStep = data.get_ready_steps;

      return {
        id: data.id,
        stock_number: data.stock_number,
        vin: data.vin,
        short_vin: data.vin.slice(-6),
        vehicle_year: data.vehicle_year,
        vehicle_make: data.vehicle_make,
        vehicle_model: data.vehicle_model,
        vehicle_trim: data.vehicle_trim || '',
        mileage: 0, // TODO: Add when field is added
        color: '', // TODO: Add when field is added
        priority: data.priority,
        status: data.status,
        step_name: currentStep?.name || 'Unknown',
        step_color: currentStep?.color || '#6B7280',
        days_in_inventory: calculateDaysInStep(data.intake_date).split(' ')[0],
        estimated_completion: data.estimated_completion_date || '',
        notes: data.notes || '',
        location: '', // TODO: Add when field is added
        technician: data.assigned_to || '',
        work_orders: [], // TODO: Add when work orders are implemented
        current_step: currentStep ? {
          name: currentStep.name,
          color: currentStep.color,
          order_index: currentStep.order_index
        } : undefined
      };
    },
    enabled: !!vehicleId && !!dealerId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Hook for vehicle list with step filtering
export interface GetReadyVehicleListFilters {
  searchQuery?: string;
  selectedStep?: string;
  selectedWorkflow?: string;
  selectedPriority?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useGetReadyVehiclesList(filters: GetReadyVehicleListFilters = {}) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);
  const {
    searchQuery = '',
    selectedStep = 'all',
    selectedWorkflow = 'all',
    selectedPriority = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = filters;

  return useOrderPolling(
    [
      'get-ready-vehicles',
      'list',
      currentDealership?.id,
      searchQuery,
      selectedStep,
      selectedWorkflow,
      selectedPriority,
      sortBy,
      sortOrder
    ],
    async () => {
      if (!dealerId) {
        console.warn('No dealership selected for vehicle list query');
        return [];
      }

      // Build base query
      let query = supabase
        .from('get_ready_vehicles')
        .select(`
          id,
          stock_number,
          vin,
          vehicle_year,
          vehicle_make,
          vehicle_model,
          vehicle_trim,
          step_id,
          workflow_type,
          priority,
          status,
          assigned_to,
          notes,
          intake_date,
          created_at,
          updated_at,
          media_count,
          notes_count,
          requires_approval,
          approval_status,
          approved_by,
          approved_at,
          approval_notes,
          rejected_by,
          rejected_at,
          rejection_reason,
          get_ready_steps!inner (
            name,
            color,
            order_index
          ),
          get_ready_work_items (
            id,
            title,
            description,
            status,
            approval_required,
            approval_status
          )
        `)
        .eq('dealer_id', dealerId)
        .is('deleted_at', null);

      // ✅ Apply step filter (ignored when search is active for global search)
      if (selectedStep && selectedStep !== 'all' && !searchQuery) {
        query = query.eq('step_id', selectedStep);
      }

      // Apply workflow filter
      if (selectedWorkflow && selectedWorkflow !== 'all') {
        query = query.eq('workflow_type', selectedWorkflow);
      }

      // Apply priority filter
      if (selectedPriority && selectedPriority !== 'all') {
        query = query.eq('priority', selectedPriority);
      }

      // Apply search filter
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        // Sanitize search term to prevent wildcard bypass
        const sanitized = term
          .replace(/\/g, '\\')  // Escape backslash first
          .replace(/%/g, '\%')        // Escape percent wildcard
          .replace(/_/g, '\_');       // Escape underscore wildcard
        query = query.or(`stock_number.ilike.%${term}%,vin.ilike.%${term}%,vehicle_make.ilike.%${term}%,vehicle_model.ilike.%${term}%,assigned_to.ilike.%${term}%`);
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      if (sortBy === 'days_in_step') {
        query = query.order('intake_date', { ascending: !ascending }); // Reverse for days
      } else if (sortBy === 'stock_number') {
        query = query.order('stock_number', { ascending });
      } else {
        query = query.order(sortBy as VehicleSortField, { ascending });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicle list:', error);
        throw error;
      }

      if (!data) return [];

      // BATCH QUERY: Get vehicle images from Stock inventory by VIN
      const vins = data.map(v => v.vin).filter(Boolean);
      let stockImagesMap = new Map<string, string>();

      if (vins.length > 0) {
        const { data: stockImages, error: stockError } = await supabase
          .from('dealer_vehicle_inventory')
          .select('vin, key_photo_url')
          .eq('dealer_id', dealerId)
          .in('vin', vins)
          .not('key_photo_url', 'is', null);

        if (!stockError && stockImages) {
          stockImages.forEach(img => {
            if (img.vin && img.key_photo_url) {
              stockImagesMap.set(img.vin, img.key_photo_url);
            }
          });
          console.log(`📸 [Get Ready] Loaded ${stockImagesMap.size} vehicle images from Stock inventory`);
        }
      }

      // Transform to match MockVehicle interface
      return data.map((vehicle: VehicleDatabaseResponse) => {
        const stepOrder = vehicle.get_ready_steps?.order_index || 0;

        // Calculate work items counts by status
        const workItems = vehicle.get_ready_work_items || [];
        const work_item_counts = {
          pending: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'pending').length,
          in_progress: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'in_progress').length,
          completed: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'completed').length,
          declined: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'declined').length,
        };

        return {
          id: vehicle.id,
          stock_number: vehicle.stock_number,
          vin: vehicle.vin,
          year: vehicle.vehicle_year,
          make: vehicle.vehicle_make,
          model: vehicle.vehicle_model,
          trim: vehicle.vehicle_trim || '',
          step_id: vehicle.step_id,
          step_name: vehicle.get_ready_steps?.name || 'Unknown',
          workflow_type: vehicle.workflow_type,
          priority: vehicle.priority,
          days_in_step: calculateDIS(vehicle.intake_date),
          days_to_frontline: calculateDTF(stepOrder, 8, 12), // 8 steps, 12h avg per step
          sla_status: 'on_track', // TODO: Calculate based on SLA
          t2l: calculateT2L(vehicle.created_at),
          holding_cost: 0, // TODO: Calculate holding cost
          assigned_to: vehicle.assigned_to || 'Unassigned',
          notes: vehicle.notes || '',
          progress: Math.min(100, Math.round((stepOrder / 8) * 100)), // Calculate progress based on step
          created_at: vehicle.created_at,
          updated_at: vehicle.updated_at,
          images: stockImagesMap.has(vehicle.vin) ? [stockImagesMap.get(vehicle.vin)!] : [],
          work_items: workItems.length,
          work_item_counts,
          media_count: 0, // TODO: Count media
          // Approval fields
          requires_approval: vehicle.requires_approval || false,
          approval_status: vehicle.approval_status || 'not_required',
          approved_by: vehicle.approved_by,
          approved_at: vehicle.approved_at,
          approval_notes: vehicle.approval_notes,
          rejected_by: vehicle.rejected_by,
          rejected_at: vehicle.rejected_at,
          rejection_reason: vehicle.rejection_reason,
        };
      });
    },
    !!currentDealership?.id
  );
}

// Hook for infinite scroll vehicle list
const PAGE_SIZE = 5; // Show 5 vehicles initially, load more with infinite scroll

export function useGetReadyVehiclesInfinite(filters: GetReadyVehicleListFilters = {}) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);
  const queryClient = useQueryClient();
  const {
    searchQuery = '',
    selectedStep = 'all',
    selectedWorkflow = 'all',
    selectedPriority = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = filters;

  // Invalidate cache when dealer changes to ensure fresh data
  useEffect(() => {
    if (currentDealership?.id) {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
    }
  }, [currentDealership?.id, queryClient]);

  return useInfiniteQuery({
    queryKey: [
      'get-ready-vehicles',
      'infinite',
      currentDealership?.id,
      searchQuery,
      selectedStep,
      selectedWorkflow,
      selectedPriority,
      sortBy,
      sortOrder
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (!dealerId) {
        console.warn('No dealership selected for vehicle list query');
        return { vehicles: [], hasMore: false };
      }

      // Build base query
      let query = supabase
        .from('get_ready_vehicles')
        .select(`
          id,
          stock_number,
          vin,
          vehicle_year,
          vehicle_make,
          vehicle_model,
          vehicle_trim,
          step_id,
          workflow_type,
          priority,
          status,
          assigned_to,
          notes,
          intake_date,
          created_at,
          updated_at,
          media_count,
          notes_count,
          requires_approval,
          approval_status,
          approved_by,
          approved_at,
          approval_notes,
          rejected_by,
          rejected_at,
          rejection_reason,
          get_ready_steps!inner (
            name,
            color,
            order_index
          ),
          get_ready_work_items (
            id,
            title,
            description,
            status,
            approval_required,
            approval_status
          )
        `)
        .eq('dealer_id', dealerId)
        .is('deleted_at', null);

      // ✅ Apply step filter (ignored when search is active for global search)
      if (selectedStep && selectedStep !== 'all' && !searchQuery) {
        query = query.eq('step_id', selectedStep);
      }

      // Apply workflow filter
      if (selectedWorkflow && selectedWorkflow !== 'all') {
        query = query.eq('workflow_type', selectedWorkflow);
      }

      // Apply priority filter
      if (selectedPriority && selectedPriority !== 'all') {
        query = query.eq('priority', selectedPriority);
      }

      // Apply search filter
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        // Sanitize search term to prevent wildcard bypass
        const sanitized = term
          .replace(/\/g, '\\')  // Escape backslash first
          .replace(/%/g, '\%')        // Escape percent wildcard
          .replace(/_/g, '\_');       // Escape underscore wildcard
        query = query.or(`stock_number.ilike.%${term}%,vin.ilike.%${term}%,vehicle_make.ilike.%${term}%,vehicle_model.ilike.%${term}%,assigned_to.ilike.%${term}%`);
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      if (sortBy === 'days_in_step') {
        query = query.order('intake_date', { ascending: !ascending });
      } else if (sortBy === 'stock_number') {
        query = query.order('stock_number', { ascending });
      } else {
        query = query.order(sortBy as VehicleSortField, { ascending });
      }

      // Add pagination
      query = query.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicle list:', error);
        throw error;
      }

      if (!data) return { vehicles: [], hasMore: false };

      // ✅ OPTIMIZATION: No longer need separate queries for media/notes counts
      // media_count and notes_count are now maintained by database triggers

      // BATCH QUERY: Get vehicle images from Stock inventory by VIN
      const vins = data.map(v => v.vin).filter(Boolean);
      let stockImagesMap = new Map<string, string>();

      if (vins.length > 0) {
        const { data: stockImages, error: stockError } = await supabase
          .from('dealer_vehicle_inventory')
          .select('vin, key_photo_url')
          .eq('dealer_id', dealerId)
          .in('vin', vins)
          .not('key_photo_url', 'is', null);

        if (!stockError && stockImages) {
          stockImages.forEach(img => {
            if (img.vin && img.key_photo_url) {
              stockImagesMap.set(img.vin, img.key_photo_url);
            }
          });
          console.log(`📸 [Get Ready Infinite] Loaded ${stockImagesMap.size} vehicle images from Stock inventory`);
        }
      }

      // Transform data
      const vehicles = data.map((vehicle: VehicleDatabaseResponse) => {
        const stepOrder = vehicle.get_ready_steps?.order_index || 0;

        // Calculate work items counts by status
        const workItems = vehicle.get_ready_work_items || [];
        const work_item_counts = {
          pending: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'pending').length,
          in_progress: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'in_progress').length,
          completed: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'completed').length,
          declined: workItems.filter((item: GetReadyWorkItemSummary) => item.status === 'declined').length,
        };

        // Get pending work items that need approval
        const pendingApprovalWorkItems = workItems.filter((item: GetReadyWorkItemSummary) =>
          item.approval_required === true &&
          (!item.approval_status || item.approval_status !== 'approved')
        );

        return {
          id: vehicle.id,
          stock_number: vehicle.stock_number,
          vin: vehicle.vin,
          year: vehicle.vehicle_year,
          make: vehicle.vehicle_make,
          model: vehicle.vehicle_model,
          trim: vehicle.vehicle_trim || '',
          step_id: vehicle.step_id,
          step_name: vehicle.get_ready_steps?.name || 'Unknown',
          workflow_type: vehicle.workflow_type,
          priority: vehicle.priority,
          days_in_step: calculateDIS(vehicle.intake_date),
          days_to_frontline: calculateDTF(stepOrder, 8, 12), // 8 steps, 12h avg per step
          sla_status: 'on_track',
          t2l: calculateT2L(vehicle.created_at),
          holding_cost: 0,
          assigned_to: vehicle.assigned_to || 'Unassigned',
          notes: vehicle.notes || '',
          progress: Math.min(100, Math.round((stepOrder / 8) * 100)), // Calculate progress based on step
          created_at: vehicle.created_at,
          updated_at: vehicle.updated_at,
          images: stockImagesMap.has(vehicle.vin) ? [stockImagesMap.get(vehicle.vin)!] : [],
          work_items: workItems, // ARRAY COMPLETO
          work_items_count: workItems.length, // Count separado
          work_item_counts,
          pending_approval_work_items: pendingApprovalWorkItems, // Work items pendientes
          media_count: vehicle.media_count || 0, // ✅ From database (trigger-maintained)
          notes_preview: (vehicle.notes_count || 0).toString(), // ✅ From database (trigger-maintained)
          // Approval fields
          requires_approval: vehicle.requires_approval || false,
          approval_status: vehicle.approval_status || 'not_required',
          approved_by: vehicle.approved_by,
          approved_at: vehicle.approved_at,
          approval_notes: vehicle.approval_notes,
          rejected_by: vehicle.rejected_by,
          rejected_at: vehicle.rejected_at,
          rejection_reason: vehicle.rejection_reason
        };
      });

      return {
        vehicles,
        hasMore: data.length === PAGE_SIZE
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!dealerId,
    staleTime: 1000 * 30,
    refetchOnMount: 'always', // ✅ FIX: Always refetch when dealer changes from null to valid
  });
}
