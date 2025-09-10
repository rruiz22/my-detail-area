import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReconVehicle {
  id: string;
  stock_number: string;
  vin: string;
  short_vin: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  current_step_name: string;
  current_step_color: string;
  current_step_order: number;
  status: string;
  priority: string;
  days_in_step: string;
  media_count: number;
  work_item_counts: Record<string, number>;
  notes_preview: string;
  retail_value: number | null;
  created_at: string;
}

interface GetReadyStore {
  // Selected states
  selectedStepId: string | null;
  selectedVehicleId: string | null;
  
  // View states
  currentView: 'overview' | 'details' | 'approvals' | 'reports';
  splitLayout: boolean;
  
  // Filters
  searchTerm: string;
  priorityFilter: string | null;
  statusFilter: string | null;
  
  // Actions
  setSelectedStepId: (stepId: string | null) => void;
  setSelectedVehicleId: (vehicleId: string | null) => void;
  setCurrentView: (view: 'overview' | 'details' | 'approvals' | 'reports') => void;
  setSplitLayout: (split: boolean) => void;
  setSearchTerm: (term: string) => void;
  setPriorityFilter: (priority: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  reset: () => void;
}

export const useGetReadyStore = create<GetReadyStore>()(
  persist(
    (set) => ({
      // Initial state
      selectedStepId: null,
      selectedVehicleId: null,
      currentView: 'overview',
      splitLayout: true,
      searchTerm: '',
      priorityFilter: null,
      statusFilter: null,
      
      // Actions
      setSelectedStepId: (stepId) => set({ selectedStepId: stepId }),
      setSelectedVehicleId: (vehicleId) => set({ selectedVehicleId: vehicleId }),
      setCurrentView: (view) => set({ currentView: view }),
      setSplitLayout: (split) => set({ splitLayout: split }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setPriorityFilter: (priority) => set({ priorityFilter: priority }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      reset: () => set({
        selectedStepId: null,
        selectedVehicleId: null,
        currentView: 'overview',
        splitLayout: true,
        searchTerm: '',
        priorityFilter: null,
        statusFilter: null,
      }),
    }),
    {
      name: 'get-ready-store',
      partialize: (state) => ({
        currentView: state.currentView,
        splitLayout: state.splitLayout,
        selectedStepId: state.selectedStepId,
      }),
    }
  )
);