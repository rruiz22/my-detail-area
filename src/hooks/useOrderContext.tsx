import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export interface OrderContext {
  id: string;
  customOrderNumber: string;
  customerName: string;
  customerEmail?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  status: string;
  createdAt: string;
  totalAmount?: number;
}

export const useOrderContext = (orderId?: string | null) => {
  const [orderData, setOrderData] = useState<OrderContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();

  useEffect(() => {
    if (!orderId || !user || !currentDealership) {
      setOrderData(null);
      return;
    }

    const fetchOrderContext = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            custom_order_number,
            customer_name,
            customer_email,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            status,
            created_at,
            total_amount
          `)
          .eq('id', orderId)
          .eq('dealer_id', currentDealership.id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setOrderData({
            id: data.id,
            customOrderNumber: data.custom_order_number || data.id.slice(-8),
            customerName: data.customer_name || 'Unknown Customer',
            customerEmail: data.customer_email || undefined,
            vehicleMake: data.vehicle_make || undefined,
            vehicleModel: data.vehicle_model || undefined,
            vehicleYear: data.vehicle_year || undefined,
            status: data.status || 'pending',
            createdAt: data.created_at,
            totalAmount: data.total_amount || undefined
          });
        }
      } catch (err: any) {
        console.error('Error fetching order context:', err);
        setError(err.message);
        setOrderData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderContext();
  }, [orderId, user, currentDealership]);

  return {
    orderData,
    loading,
    error
  };
};