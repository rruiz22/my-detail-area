import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
  acv_wholesale?: number;
  acv_max_retail?: number;
  last_reprice_date?: string;
  market_rank_matching?: number;
  market_listings_matching?: number;
  market_rank_overall?: number;
  market_listings_overall?: number;
  percent_to_market?: number;
  cost_to_market?: number;
  mds_overall?: number;
  mds_matching?: number;
  photo_count?: number;
  key_photo_url?: string;
  leads_last_7_days?: number;
  leads_daily_avg_last_7_days?: number;
  leads_since_last_reprice?: number;
  leads_total?: number;
  cargurus_ctr?: number;
  cargurus_srp_views?: number;
  cargurus_vdp_views?: number;
  mmr_value?: number;
  mmr_vs_cost?: number;
  galves_value?: number;
  water_damage?: boolean;
  risk_light?: string;
  key_information?: string;
  objective?: string;
  syndication_status?: string;
  proof_point_msrp?: string;
  proof_point_jd_power?: string;
  proof_point_kbb?: string;
  proof_point_market?: string;
  raw_data?: any;
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
  lastRefresh: number;
}

export const useStockManagement = (): UseStockManagementReturn => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentDealership } = useAccessibleDealerships();

  const dealerId = currentDealership?.id;

  // Use React Query with smart polling for inventory data
  const inventoryQuery = useSmartPolling<VehicleInventory[]>({
    queryKey: ['stock-inventory', dealerId],
    queryFn: async (): Promise<VehicleInventory[]> => {
      if (!dealerId) {
        console.warn('No dealership selected for inventory query');
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('dealer_vehicle_inventory')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching inventory:', fetchError);
        throw fetchError;
      }

      return data || [];
    },
    enabled: !!dealerId, // Only enable query when dealerId is provided
    interval: 180000, // 3 minutes
    staleTime: 30000, // 30 seconds
  });

  // Derive inventory from query data using useMemo for silent updates
  const inventory = useMemo(() => {
    return inventoryQuery.data || [];
  }, [inventoryQuery.data]);

  const refreshInventory = useCallback(async () => {
    if (!dealerId) return;
    await queryClient.invalidateQueries({ queryKey: ['stock-inventory', dealerId] });
  }, [dealerId, queryClient]);

  // Helper methods
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
      toast({
        title: t('common.error'),
        description: 'Missing dealer ID or user authentication',
        variant: 'destructive'
      });
      return { success: false, message: 'Missing dealer ID or user authentication' };
    }

    try {
      console.log(`🔄 Starting CSV upload: ${file.name} (${file.size} bytes)`);

      const text = await file.text();

      if (!text.trim()) {
        toast({
          title: t('common.error'),
          description: 'CSV file is empty',
          variant: 'destructive'
        });
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

        // Step 1: Get count of existing vehicles before deactivating
        const { count: oldVehicleCount } = await supabase
          .from('dealer_vehicle_inventory')
          .select('*', { count: 'exact', head: true })
          .eq('dealer_id', dealerId)
          .eq('is_active', true);

        console.log(`📊 Current active vehicles: ${oldVehicleCount || 0}`);

        // Step 2: Mark ALL existing vehicles for this dealer as inactive
        console.log(`🔄 Marking existing vehicles as inactive for dealer ${dealerId}...`);
        const { error: deactivateError } = await supabase
          .from('dealer_vehicle_inventory')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('dealer_id', dealerId);

        if (deactivateError) {
          console.warn('⚠️ Warning: Could not deactivate old vehicles:', deactivateError);
          // Continue anyway - this is not critical
        }

        // Step 3: Upsert new vehicles (they will be marked as active)
        const { error: upsertError } = await supabase
          .from('dealer_vehicle_inventory')
          .upsert(processingResult.vehicles, {
            onConflict: 'dealer_id,stock_number'
          });

        if (upsertError) throw upsertError;

        // Step 4: Get count of vehicles that are now marked as inactive (removed from inventory)
        const removedVehicles = Math.max(0, (oldVehicleCount || 0) - processingResult.vehicles.length);

        // Enhanced sync logging with processing details
        const syncLogData = {
          dealer_id: dealerId,
          sync_type: 'csv_upload',
          sync_status: 'completed',
          records_processed: processingResult.stats.processed,
          records_added: processingResult.vehicles.length,
          records_updated: Math.min(processingResult.vehicles.length, oldVehicleCount || 0),
          records_removed: removedVehicles,
          records_invalid: processingResult.stats.invalid,
          file_name: file.name,
          file_size: file.size,
          file_timestamp: fileTimestamp?.toISOString() || null,
          separator_detected: parseResult.separator,
          columns_mapped: JSON.stringify(Object.keys(parseResult.detectedColumns)),
          processing_logs: JSON.stringify(processingResult.logs.slice(-20)), // Only last 20 logs
          processed_by: user.id
        };

        // Try to insert sync log, but don't fail if it doesn't work
        try {
          await supabase
            .from('dealer_inventory_sync_log')
            .insert(syncLogData);
        } catch (logError) {
          console.warn('⚠️ Could not save sync log (non-critical):', logError);
          // Continue anyway - log is not critical for operation
        }

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ['stock-inventory', dealerId] });

        console.log('✅ CSV upload completed successfully');
        console.log(`📦 Active inventory: ${processingResult.vehicles.length} vehicles (${removedVehicles} removed)`);

        // Show success toast
        const successMessage = removedVehicles > 0
          ? `${processingResult.vehicles.length} vehicles active (${removedVehicles} removed from inventory)`
          : `${processingResult.vehicles.length} vehicles processed successfully`;

        toast({
          title: t('common.success'),
          description: successMessage
        });

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

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive'
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload CSV';

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }, [dealerId, user, queryClient, t]);

  return {
    inventory,
    loading: inventoryQuery.isLoading,
    error: inventoryQuery.error ? (inventoryQuery.error as Error).message : null,
    searchInventory,
    getVehicleByStock,
    getVehicleByVin,
    uploadCSV,
    refreshInventory,
    lastRefresh: inventoryQuery.dataUpdatedAt || Date.now()
  };
};
