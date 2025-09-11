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
  uploadCSV: (file: File) => Promise<{ success: boolean; message: string; details?: any }>;
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

  const uploadCSV = useCallback(async (file: File): Promise<{ success: boolean; message: string; details?: any }> => {
    if (!dealerId || !user) {
      return { success: false, message: 'Missing dealer ID or user authentication' };
    }

    try {
      console.log(`🔄 Starting CSV upload: ${file.name} (${file.size} bytes)`);
      
      const text = await file.text();
      
      if (!text.trim()) {
        return { success: false, message: 'CSV file is empty' };
      }

      // Parse CSV with intelligent detection
      const { parseCSV, processVehicleData, extractFileTimestamp } = await import('@/utils/csvUtils');
      
      // Extract timestamp from filename
      const fileTimestamp = extractFileTimestamp(file.name);
      console.log('📅 File timestamp:', fileTimestamp);

      // Parse CSV content
      const parseResult = parseCSV(text);
      console.log('📊 Parse results:', {
        separator: parseResult.separator,
        headers: parseResult.headers.length,
        rows: parseResult.rows.length,
        detectedColumns: Object.keys(parseResult.detectedColumns)
      });

      // Process vehicle data with detailed logging
      const processingResult = processVehicleData(parseResult, dealerId);
      
      // Log detailed processing information
      console.log('🚗 Processing results:', processingResult.stats);
      processingResult.logs.forEach(log => {
        console.log(`[${log.step}] ${log.message}`, log.data || '');
      });

      if (processingResult.vehicles.length > 0) {
        console.log(`📤 Uploading ${processingResult.vehicles.length} vehicles to database...`);
        
        const { error: upsertError } = await supabase
          .from('dealer_vehicle_inventory')
          .upsert(processingResult.vehicles, {
            onConflict: 'dealer_id,stock_number'
          });

        if (upsertError) throw upsertError;

        // Enhanced sync logging with processing details
        const syncLogData = {
          dealer_id: dealerId,
          sync_type: 'csv_upload',
          sync_status: 'completed',
          records_processed: processingResult.stats.processed,
          records_added: processingResult.vehicles.length,
          records_invalid: processingResult.stats.invalid,
          file_name: file.name,
          file_size: file.size,
          file_timestamp: fileTimestamp?.toISOString(),
          separator_detected: parseResult.separator,
          columns_mapped: Object.keys(parseResult.detectedColumns),
          processing_logs: processingResult.logs,
          processed_by: user.id
        };

        await supabase
          .from('dealer_inventory_sync_log')
          .insert(syncLogData);

        await refreshInventory();
        
        console.log('✅ CSV upload completed successfully');
        
        return { 
          success: true, 
          message: `Successfully processed ${processingResult.vehicles.length} of ${processingResult.stats.processed} vehicles`,
          details: {
            processed: processingResult.stats.processed,
            valid: processingResult.vehicles.length,
            invalid: processingResult.stats.invalid,
            separator: parseResult.separator,
            mappedColumns: parseResult.detectedColumns,
            fileTimestamp,
            logs: processingResult.logs.slice(-10) // Last 10 log entries
          }
        };
      } else {
        const errorMessage = `No valid vehicles found. Processed ${processingResult.stats.processed} rows but none had required fields (stock_number AND vin).`;
        
        console.error('❌ No valid vehicles:', {
          stats: processingResult.stats,
          detectedColumns: parseResult.detectedColumns,
          recentLogs: processingResult.logs.slice(-5)
        });

        return { 
          success: false, 
          message: errorMessage,
          details: {
            stats: processingResult.stats,
            detectedColumns: parseResult.detectedColumns,
            separator: parseResult.separator,
            logs: processingResult.logs,
            suggestions: [
              'Verify your CSV has Stock Number and VIN columns',
              `Detected separator: "${parseResult.separator}"`,
              `Mapped columns: ${Object.keys(parseResult.detectedColumns).join(', ') || 'None'}`
            ]
          }
        };
      }

    } catch (err) {
      console.error('💥 Error uploading CSV:', err);
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