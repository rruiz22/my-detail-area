import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface VehicleNote {
  id: string;
  vehicle_id: string;
  content: string;
  note_type: 'general' | 'issue' | 'observation' | 'reminder' | 'important';
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  linked_work_item_id?: string; // NEW: Optional link to work item
  // Populated fields
  created_by_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface CreateVehicleNoteInput {
  vehicle_id: string;
  content: string;
  note_type?: 'general' | 'issue' | 'observation' | 'reminder' | 'important';
  is_pinned?: boolean;
  linked_work_item_id?: string; // NEW: Optional link to work item
}

export interface UpdateVehicleNoteInput {
  content?: string;
  note_type?: 'general' | 'issue' | 'observation' | 'reminder' | 'important';
  is_pinned?: boolean;
  linked_work_item_id?: string; // NEW: Optional link to work item
}

// Hook to fetch notes for a vehicle
export function useVehicleNotes(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-notes', vehicleId],
    queryFn: async (): Promise<VehicleNote[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('vehicle_notes')
        .select(`
          *,
          created_by_profile:profiles!created_by(
            first_name,
            last_name,
            email
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });
}

// Hook to create a new note
export function useCreateVehicleNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateVehicleNoteInput) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to create notes');
      }

      // Get dealer_id from the vehicle
      const { data: vehicle, error: vehicleError } = await supabase
        .from('get_ready_vehicles')
        .select('dealer_id')
        .eq('id', input.vehicle_id)
        .single();

      if (vehicleError) throw vehicleError;
      if (!vehicle) throw new Error('Vehicle not found');

      const { data, error } = await supabase
        .from('vehicle_notes')
        .insert({
          vehicle_id: input.vehicle_id,
          dealer_id: vehicle.dealer_id,
          content: input.content,
          note_type: input.note_type || 'general',
          is_pinned: input.is_pinned || false,
          linked_work_item_id: input.linked_work_item_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}

// Hook to update a note
export function useUpdateVehicleNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, vehicleId, updates }: { noteId: string; vehicleId: string; updates: UpdateVehicleNoteInput }) => {
      const { data, error } = await supabase
        .from('vehicle_notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}

// Hook to delete a note
export function useDeleteVehicleNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, vehicleId }: { noteId: string; vehicleId: string }) => {
      const { error } = await supabase
        .from('vehicle_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}

// Hook to toggle pin status
export function useTogglePinNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, vehicleId, isPinned }: { noteId: string; vehicleId: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from('vehicle_notes')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-notes', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Auto-refresh activity log
    },
  });
}
