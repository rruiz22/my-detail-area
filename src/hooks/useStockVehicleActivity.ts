import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StockVehicleActivity {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  activity_type: string;
  action_by?: string;
  action_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined data
  action_by_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } | null;
}

export function useStockVehicleActivity(vehicleId: string | null) {
  return useQuery({
    queryKey: ['stock-vehicle-activity', vehicleId],
    queryFn: async (): Promise<StockVehicleActivity[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('dealer_vehicle_activity_log')
        .select(`
          *,
          action_by_profile:profiles!action_by(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle activity:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!vehicleId,
  });
}

// Hook para registrar actividad manual (desde UI)
export function useLogStockVehicleActivity(vehicleId: string, dealerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      type: string;
      description: string;
      field_name?: string;
      old_value?: string;
      new_value?: string;
      metadata?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('dealer_vehicle_activity_log')
        .insert({
          vehicle_id: vehicleId,
          dealer_id: dealerId,
          activity_type: activity.type,
          description: activity.description,
          field_name: activity.field_name,
          old_value: activity.old_value,
          new_value: activity.new_value,
          metadata: activity.metadata || {},
          action_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-vehicle-activity', vehicleId] });
    }
  });
}
