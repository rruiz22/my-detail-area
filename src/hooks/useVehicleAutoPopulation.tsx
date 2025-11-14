import { useState, useCallback } from 'react';
import { useStockManagement } from '@/hooks/useStockManagement';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleSearchResult {
  source: 'inventory' | 'vin_api' | 'manual' | 'orders';
  confidence: 'high' | 'medium' | 'low';
  data: {
    stockNumber?: string;
    vin?: string;
    year?: string | number;
    make?: string;
    model?: string;
    trim?: string;
    vehicleInfo?: string;
    price?: number;
    mileage?: number;
    color?: string;
    imageUrl?: string;
    // Inventory-specific enrichment
    age_days?: number;
    leads_total?: number;
    market_rank_overall?: number;
    acv_wholesale?: number;
    estimated_profit?: number;
    // Orders-specific data
    orderNumber?: string;
    orderDate?: string;
    orderStatus?: string;
  };
  preview?: {
    title: string;
    subtitle?: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
}

interface UseVehicleAutoPopulationReturn {
  searchVehicle: (query: string) => Promise<VehicleSearchResult[]>;
  searchByStock: (stockNumber: string) => Promise<VehicleSearchResult | null>;
  searchByVin: (vin: string) => Promise<VehicleSearchResult | null>;
  loading: boolean;
  error: string | null;
}

export function useVehicleAutoPopulation(dealerId?: number): UseVehicleAutoPopulationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { dealerships } = useAccessibleDealerships();
  const currentDealerId = dealerId || dealerships[0]?.id;
  
  const { searchInventory, getVehicleByStock, getVehicleByVin } = useStockManagement(currentDealerId);
  const { decodeVin } = useVinDecoding();

  const createInventoryResult = (vehicle: any): VehicleSearchResult => {
    const title = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    const subtitle = vehicle.trim ? `${vehicle.trim} - Stock: ${vehicle.stock_number}` : `Stock: ${vehicle.stock_number}`;

    let badge = 'In Stock';
    let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';

    if (vehicle.age_days > 60) {
      badge = `${vehicle.age_days} days old`;
      badgeVariant = 'outline';
    } else if (vehicle.leads_total > 5) {
      badge = `${vehicle.leads_total} leads`;
      badgeVariant = 'default';
    }

    return {
      source: 'inventory',
      confidence: 'high',
      data: {
        stockNumber: vehicle.stock_number,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        vehicleInfo: `${title}${vehicle.trim ? ` (${vehicle.trim})` : ''}`,
        price: vehicle.price,
        mileage: vehicle.mileage,
        color: vehicle.color,
        imageUrl: vehicle.key_photo_url,
        age_days: vehicle.age_days,
        leads_total: vehicle.leads_total,
        market_rank_overall: vehicle.market_rank_overall,
        acv_wholesale: vehicle.acv_wholesale,
        estimated_profit: vehicle.estimated_profit
      },
      preview: {
        title,
        subtitle,
        badge,
        badgeVariant
      }
    };
  };

  const createVinResult = (vehicleData: any): VehicleSearchResult => {
    const title = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
    return {
      source: 'vin_api',
      confidence: 'medium',
      data: {
        vin: vehicleData.vin,
        year: vehicleData.year,
        make: vehicleData.make,
        model: vehicleData.model,
        trim: vehicleData.trim,
        vehicleInfo: vehicleData.vehicleInfo
      },
      preview: {
        title,
        subtitle: 'From VIN Decode',
        badge: 'API Data',
        badgeVariant: 'secondary'
      }
    };
  };

  const createOrderResult = (order: any): VehicleSearchResult => {
    const title = `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim();
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const subtitle = [
      order.stock_number ? `Stock: ${order.stock_number}` : null,
      order.order_number ? `Order #${order.order_number}` : null
    ].filter(Boolean).join(' • ');

    return {
      source: 'orders',
      confidence: 'medium',
      data: {
        stockNumber: order.stock_number,
        vin: order.vehicle_vin,
        year: order.vehicle_year,
        make: order.vehicle_make,
        model: order.vehicle_model,
        vehicleInfo: order.vehicle_info || title,
        orderNumber: order.order_number,
        orderDate,
        orderStatus: order.status
      },
      preview: {
        title,
        subtitle,
        badge: `${orderDate} • ${order.status || 'N/A'}`,
        badgeVariant: 'outline'
      }
    };
  };

  const searchOrdersForVehicles = useCallback(async (query: string, dealerId: number): Promise<VehicleSearchResult[]> => {
    try {
      // Search in orders table from the last year only
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from('orders')
        .select('vehicle_vin, vehicle_year, vehicle_make, vehicle_model, vehicle_info, stock_number, order_number, created_at, status, order_type')
        .eq('dealer_id', dealerId)
        .in('order_type', ['sales', 'recon'])
        .gte('created_at', oneYearAgo.toISOString())
        .or(`stock_number.ilike.%${query}%,vehicle_vin.ilike.%${query}%,vehicle_make.ilike.%${query}%,vehicle_model.ilike.%${query}%`)
        .limit(5);

      if (error) {
        console.error('Error searching orders:', error);
        return [];
      }

      return (data || []).map(order => createOrderResult(order));
    } catch (err) {
      console.error('Error in searchOrdersForVehicles:', err);
      return [];
    }
  }, []);

  const searchByStock = useCallback(async (stockNumber: string): Promise<VehicleSearchResult | null> => {
    if (!stockNumber || !currentDealerId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const vehicle = getVehicleByStock(stockNumber);
      if (vehicle) {
        return createInventoryResult(vehicle);
      }
      return null;
    } catch (err) {
      setError('Error searching by stock number');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentDealerId, getVehicleByStock]);

  const searchByVin = useCallback(async (vin: string): Promise<VehicleSearchResult | null> => {
    if (!vin || vin.length !== 17) return null;

    setLoading(true);
    setError(null);

    try {
      // First check local inventory
      if (currentDealerId) {
        const localVehicle = getVehicleByVin(vin);
        if (localVehicle) {
          setLoading(false);
          return createInventoryResult(localVehicle);
        }
      }

      // Fallback to VIN API ONLY if not found in inventory
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        return createVinResult({ ...vehicleData, vin });
      }

      return null;
    } catch (err) {
      // Silently fail - don't set error for VIN decode failures
      console.warn('VIN decode failed for:', vin, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentDealerId, getVehicleByVin, decodeVin]);

  const searchVehicle = useCallback(async (query: string): Promise<VehicleSearchResult[]> => {
    if (!query || query.length < 2) return [];

    setLoading(true);
    setError(null);

    try {
      const results: VehicleSearchResult[] = [];

      // Check if it's a VIN (17 characters)
      if (query.length === 17) {
        const vinResult = await searchByVin(query);
        if (vinResult) results.push(vinResult);
        return results;
      }

      // Check if it's a stock number first
      if (currentDealerId) {
        const stockResult = await searchByStock(query);
        if (stockResult) {
          results.push(stockResult);
        }

        // Search inventory by general query
        const inventoryResults = searchInventory(query);
        inventoryResults.forEach(vehicle => {
          // Avoid duplicates from stock search
          if (!results.some(r => r.data.stockNumber === vehicle.stock_number)) {
            results.push(createInventoryResult(vehicle));
          }
        });

        // If we have less than 5 results, search in orders as fallback
        if (results.length < 5) {
          const ordersResults = await searchOrdersForVehicles(query, currentDealerId);

          // Deduplicate by VIN - prioritize inventory results
          const seenVins = new Set(
            results
              .map(r => r.data.vin)
              .filter((vin): vin is string => Boolean(vin))
          );

          ordersResults.forEach(orderResult => {
            // Only add if VIN is not already in results (or if no VIN)
            if (!orderResult.data.vin || !seenVins.has(orderResult.data.vin)) {
              results.push(orderResult);
              if (orderResult.data.vin) {
                seenVins.add(orderResult.data.vin);
              }
            }
          });
        }
      }

      return results.slice(0, 5); // Limit to 5 results
    } catch (err) {
      setError('Error searching vehicles');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentDealerId, searchInventory, searchByStock, searchByVin, searchOrdersForVehicles]);

  return {
    searchVehicle,
    searchByStock,
    searchByVin,
    loading,
    error
  };
}