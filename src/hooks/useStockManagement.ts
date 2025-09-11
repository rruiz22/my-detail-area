import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VehicleInventory {
  id: string;
  dealer_id: number;
  stock_number: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  drivetrain?: string;
  segment?: string;
  color?: string;
  mileage?: number;
  is_certified?: boolean;
  certified_program?: string;
  dms_status?: string;
  lot_location?: string;
  age_days?: number;
  price?: number;
  msrp?: number;
  unit_cost?: number;
  estimated_profit?: number;
  photo_count?: number;
  key_photo_url?: string;
  leads_last_7_days?: number;
  leads_total?: number;
  risk_light?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface UseStockManagementReturn {
  inventory: VehicleInventory[];
  loading: boolean;
  error: string | null;
  searchInventory: (query: string) => VehicleInventory[];
  getVehicleByStock: (stockNumber: string) => VehicleInventory | null;
  getVehicleByVin: (vin: string) => VehicleInventory | null;
  uploadCSV: (file: File) => Promise<{ success: boolean; message: string }>;
  refreshInventory: () => Promise<void>;
}

export const useStockManagement = (dealerId?: number): UseStockManagementReturn => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<VehicleInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshInventory = useCallback(async () => {
    if (!dealerId) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('dealer_vehicle_inventory')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    if (dealerId) {
      refreshInventory();
    }
  }, [dealerId, refreshInventory]);

  const searchInventory = useCallback((query: string): VehicleInventory[] => {
    if (!query.trim()) return inventory;
    
    const searchTerm = query.toLowerCase();
    return inventory.filter(vehicle => 
      vehicle.stock_number?.toLowerCase().includes(searchTerm) ||
      vehicle.vin?.toLowerCase().includes(searchTerm) ||
      vehicle.make?.toLowerCase().includes(searchTerm) ||
      vehicle.model?.toLowerCase().includes(searchTerm) ||
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchTerm)
    );
  }, [inventory]);

  const getVehicleByStock = useCallback((stockNumber: string): VehicleInventory | null => {
    return inventory.find(vehicle => 
      vehicle.stock_number?.toLowerCase() === stockNumber.toLowerCase()
    ) || null;
  }, [inventory]);

  const getVehicleByVin = useCallback((vin: string): VehicleInventory | null => {
    return inventory.find(vehicle => 
      vehicle.vin?.toLowerCase() === vin.toLowerCase()
    ) || null;
  }, [inventory]);

  const uploadCSV = useCallback(async (file: File): Promise<{ success: boolean; message: string }> => {
    if (!dealerId || !user) {
      return { success: false, message: 'Missing dealer ID or user authentication' };
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return { success: false, message: 'CSV file must have at least a header and one data row' };
      }

      // Parse CSV (simplified - in production would use a proper CSV parser)
      const headers = lines[0].split('\t').map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split('\t'));

      // Process each row
      const processedVehicles: any[] = [];
      for (const row of rows) {
        if (row.length < headers.length) continue;
        
        const vehicle: any = {
          dealer_id: dealerId,
          is_active: true
        };

        // Map CSV columns to database fields
        headers.forEach((header, index) => {
          const value = row[index]?.trim();
          if (!value) return;

          switch (header.toLowerCase()) {
            case 'year':
              vehicle.year = parseInt(value) || null;
              break;
            case 'make':
              vehicle.make = value;
              break;
            case 'model':
              vehicle.model = value;
              break;
            case 'trim':
              vehicle.trim = value;
              break;
            case 'drivetrain':
              vehicle.drivetrain = value;
              break;
            case 'segment':
              vehicle.segment = value;
              break;
            case 'stock number':
              vehicle.stock_number = value;
              break;
            case 'vin':
              vehicle.vin = value;
              break;
            case 'color':
              vehicle.color = value;
              break;
            case 'mileage':
              vehicle.mileage = parseInt(value) || null;
              break;
            case 'certified':
              vehicle.is_certified = value.toLowerCase() === 'yes';
              break;
            case 'certified program':
              vehicle.certified_program = value;
              break;
            case 'dms status':
              vehicle.dms_status = value;
              break;
            case 'age':
              vehicle.age_days = parseInt(value) || null;
              break;
            case 'price':
              vehicle.price = parseFloat(value.replace(/[$,]/g, '')) || null;
              break;
            case 'msrp':
              vehicle.msrp = parseFloat(value.replace(/[$,]/g, '')) || null;
              break;
            case 'photo count':
              vehicle.photo_count = parseInt(value) || 0;
              break;
            case 'key photo':
              vehicle.key_photo_url = value;
              break;
            case 'leads (last 7 days)':
              vehicle.leads_last_7_days = parseInt(value) || 0;
              break;
            case 'leads (all)':
              vehicle.leads_total = parseInt(value) || 0;
              break;
            case 'risk light':
              vehicle.risk_light = value;
              break;
            default:
              // Store other fields in raw_data
              if (!vehicle.raw_data) vehicle.raw_data = {};
              vehicle.raw_data[header] = value;
              break;
          }
        });

        if (vehicle.stock_number && vehicle.vin) {
          processedVehicles.push(vehicle);
        }
      }

      // Batch upsert vehicles
      if (processedVehicles.length > 0) {
        const { error: upsertError } = await supabase
          .from('dealer_vehicle_inventory')
          .upsert(processedVehicles, {
            onConflict: 'dealer_id,stock_number'
          });

        if (upsertError) throw upsertError;

        // Log the sync
        await supabase
          .from('dealer_inventory_sync_log')
          .insert({
            dealer_id: dealerId,
            sync_type: 'csv_upload',
            sync_status: 'completed',
            records_processed: processedVehicles.length,
            records_added: processedVehicles.length, // Simplified - would calculate actual new vs updated
            file_name: file.name,
            file_size: file.size,
            processed_by: user.id
          });

        await refreshInventory();
        
        return { 
          success: true, 
          message: `Successfully processed ${processedVehicles.length} vehicles` 
        };
      } else {
        return { success: false, message: 'No valid vehicles found in CSV' };
      }

    } catch (err) {
      console.error('Error uploading CSV:', err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to upload CSV' 
      };
    }
  }, [dealerId, user, refreshInventory]);

  return {
    inventory,
    loading,
    error,
    searchInventory,
    getVehicleByStock,
    getVehicleByVin,
    uploadCSV,
    refreshInventory
  };
};