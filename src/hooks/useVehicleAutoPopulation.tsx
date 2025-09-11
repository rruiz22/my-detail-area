import { useState, useCallback } from 'react';
import { useStockManagement } from '@/hooks/useStockManagement';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export interface VehicleSearchResult {
  source: 'inventory' | 'vin_api' | 'manual';
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
    // Inventory-specific enrichment
    age_days?: number;
    leads_total?: number;
    market_rank_overall?: number;
    acv_wholesale?: number;
    estimated_profit?: number;
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
          return createInventoryResult(localVehicle);
        }
      }
      
      // Fallback to VIN API
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        return createVinResult({ ...vehicleData, vin });
      }
      
      return null;
    } catch (err) {
      setError('Error searching by VIN');
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
      }
      
      return results.slice(0, 5); // Limit to 5 results
    } catch (err) {
      setError('Error searching vehicles');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentDealerId, searchInventory, searchByStock, searchByVin]);

  return {
    searchVehicle,
    searchByStock,
    searchByVin,
    loading,
    error
  };
}