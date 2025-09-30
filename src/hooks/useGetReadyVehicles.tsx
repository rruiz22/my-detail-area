import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReadyStore, type ReconVehicle } from './useGetReadyStore';

export function useOverviewTable() {
  const { currentDealership } = useAccessibleDealerships();
  const { searchTerm, priorityFilter, statusFilter } = useGetReadyStore();

  return useQuery({
    queryKey: ['get-ready-vehicles', 'overview', currentDealership?.id, searchTerm, priorityFilter, statusFilter],
    queryFn: async (): Promise<ReconVehicle[]> => {
      if (!currentDealership?.id) {
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
          )
        `)
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
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
      return data.map((vehicle: any) => ({
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
        work_item_counts: undefined, // TODO: Add work items when implemented
        notes_preview: vehicle.notes ? vehicle.notes.slice(0, 50) : '',
        retail_value: 0, // TODO: Add retail value when field is added
        created_at: vehicle.created_at,
      }));
    },
    enabled: !!currentDealership?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
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

  return useQuery({
    queryKey: ['get-ready-vehicle-detail', vehicleId, currentDealership?.id],
    queryFn: async () => {
      if (!vehicleId || !currentDealership?.id) return null;

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
        .eq('dealer_id', currentDealership.id)
        .single();

      if (error) {
        console.error('Error fetching vehicle detail:', error);
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        stock_number: data.stock_number,
        vin: data.vin,
        short_vin: data.vin.slice(-6),
        vehicle_year: data.vehicle_year,
        vehicle_make: data.vehicle_make,
        vehicle_model: data.vehicle_model,
        trim: data.vehicle_trim || '',
        mileage: 0, // TODO: Add when field is added
        color: '', // TODO: Add when field is added
        priority: data.priority,
        status: data.status,
        step_name: (data.get_ready_steps as any)?.name || 'Unknown',
        step_color: (data.get_ready_steps as any)?.color || '#6B7280',
        days_in_inventory: calculateDaysInStep(data.intake_date).split(' ')[0],
        estimated_completion: data.estimated_completion_date || '',
        notes: data.notes || '',
        location: '', // TODO: Add when field is added
        technician: data.assigned_to || '',
        work_orders: [] // TODO: Add when work orders are implemented
      };
    },
    enabled: !!vehicleId && !!currentDealership?.id,
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
  const {
    searchQuery = '',
    selectedStep = 'all',
    selectedWorkflow = 'all',
    selectedPriority = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = filters;

  return useQuery({
    queryKey: [
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
    queryFn: async () => {
      if (!currentDealership?.id) {
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
          get_ready_steps!inner (
            name,
            color,
            order_index
          )
        `)
        .eq('dealer_id', currentDealership.id);

      // Apply step filter
      if (selectedStep && selectedStep !== 'all') {
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
        query = query.or(`stock_number.ilike.%${term}%,vin.ilike.%${term}%,vehicle_make.ilike.%${term}%,vehicle_model.ilike.%${term}%,assigned_to.ilike.%${term}%`);
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      if (sortBy === 'days_in_step') {
        query = query.order('intake_date', { ascending: !ascending }); // Reverse for days
      } else if (sortBy === 'stock_number') {
        query = query.order('stock_number', { ascending });
      } else {
        query = query.order(sortBy as any, { ascending });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicle list:', error);
        throw error;
      }

      if (!data) return [];

      // Transform to match MockVehicle interface
      return data.map((vehicle: any) => {
        const daysInStep = Math.floor((new Date().getTime() - new Date(vehicle.intake_date).getTime()) / (1000 * 60 * 60 * 24));

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
          days_in_step: daysInStep,
          days_to_frontline: 0, // TODO: Calculate based on remaining steps
          sla_status: 'on_track', // TODO: Calculate based on SLA
          t2l: 0, // TODO: Calculate T2L
          holding_cost: 0, // TODO: Calculate holding cost
          assigned_to: vehicle.assigned_to || 'Unassigned',
          notes: vehicle.notes || '',
          progress: 0, // TODO: Calculate progress
          created_at: vehicle.created_at,
          updated_at: vehicle.updated_at,
          images: [], // TODO: Add when media is implemented
          work_items: 0, // TODO: Count work items
          media_count: 0, // TODO: Count media
        };
      });
    },
    enabled: !!currentDealership?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}