/**
 * useVehicleStatus Hook
 *
 * Fetches the current status of a vehicle in both Recon and Get Ready modules.
 * This hook checks if a vehicle is currently being processed in either workflow.
 *
 * @param stockNumber - Vehicle stock number
 * @param vin - Vehicle VIN
 * @param dealerId - Dealership ID for RLS filtering
 * @returns Object containing recon order info, get ready vehicle info, and loading state
 */

import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface ReconOrderInfo {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  orderNumber: string;
}

interface GetReadyVehicleInfo {
  id: string;
  step_id: string;
  step_name: string;
  step_color: string;
}

interface VehicleStatusData {
  reconOrder?: ReconOrderInfo;
  getReadyVehicle?: GetReadyVehicleInfo;
  loading: boolean;
  error?: Error;
}

export function useVehicleStatus(
  stockNumber: string,
  vin: string,
  dealerId: number
): VehicleStatusData {
  const [data, setData] = useState<VehicleStatusData>({ loading: true });

  useEffect(() => {
    // Skip if missing required data
    if (!stockNumber && !vin) {
      setData({ loading: false });
      return;
    }

    if (!dealerId) {
      setData({ loading: false });
      return;
    }

    const fetchStatus = async () => {
      setData(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        // Check Recon Order - all statuses (including completed/cancelled)
        const { data: reconData, error: reconError } = await supabase
          .from('orders')
          .select('id, status, order_number, custom_order_number')
          .eq('order_type', 'recon')
          .eq('dealer_id', dealerId)
          .or(`stock_number.eq.${stockNumber},vehicle_vin.eq.${vin}`)
          .maybeSingle();

        if (reconError && reconError.code !== 'PGRST116') {
          console.error('Error fetching recon status:', reconError);
        }

        // Check Get Ready Vehicle
        const { data: getReadyData, error: getReadyError } = await supabase
          .from('get_ready_vehicles')
          .select(`
            id,
            step_id,
            get_ready_steps!inner(name, color)
          `)
          .eq('dealer_id', dealerId)
          .or(`stock_number.eq.${stockNumber},vin.eq.${vin}`)
          .maybeSingle();

        if (getReadyError && getReadyError.code !== 'PGRST116') {
          console.error('Error fetching get ready status:', getReadyError);
        }

        // Transform data
        const result: VehicleStatusData = {
          loading: false
        };

        if (reconData) {
          result.reconOrder = {
            id: reconData.id,
            status: reconData.status as ReconOrderInfo['status'],
            orderNumber: reconData.order_number || reconData.custom_order_number || `#${reconData.id.slice(0, 8)}`
          };
        }

        if (getReadyData && getReadyData.get_ready_steps) {
          const step = getReadyData.get_ready_steps as { name: string; color: string };
          result.getReadyVehicle = {
            id: getReadyData.id,
            step_id: getReadyData.step_id,
            step_name: step.name,
            step_color: step.color
          };
        }

        setData(result);
      } catch (error) {
        console.error('Unexpected error fetching vehicle status:', error);
        setData({
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    };

    fetchStatus();
  }, [stockNumber, vin, dealerId]);

  return data;
}
