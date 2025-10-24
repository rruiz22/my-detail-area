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

  // Helper: Validate CSV file content
  const validateCSVFile = async (file: File): Promise<string> => {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('CSV file is empty');
    }
    return text;
  };

  // Helper: Get current active vehicle count
  const getActiveVehicleCount = async (dealerId: number): Promise<number> => {
    const { count } = await supabase
      .from('dealer_vehicle_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .eq('is_active', true);

    return count || 0;
  };

  // Helper: Deactivate all existing vehicles for a dealer
  const deactivateExistingVehicles = async (dealerId: number): Promise<void> => {
    console.log(`🔄 Marking existing vehicles as inactive for dealer ${dealerId}...`);
    const { error } = await supabase
      .from('dealer_vehicle_inventory')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('dealer_id', dealerId);

    if (error) {
      console.warn('⚠️ Warning: Could not deactivate old vehicles:', error);
      // Non-critical error, continue
    }
  };

  // Helper: Upsert vehicles to database
  const upsertVehicles = async (vehicles: any[]): Promise<void> => {
    // Deduplicate vehicles by stock_number (keep last occurrence)
    const deduplicatedMap = new Map();
    vehicles.forEach(vehicle => {
      deduplicatedMap.set(vehicle.stock_number, vehicle);
    });

    const uniqueVehicles = Array.from(deduplicatedMap.values());
    const duplicateCount = vehicles.length - uniqueVehicles.length;

    if (duplicateCount > 0) {
      console.warn(`⚠️  Found ${duplicateCount} duplicate stock numbers - using latest occurrence`);
      toast({
        title: t('common.warning', 'Advertencia'),
        description: `Se encontraron ${duplicateCount} stock numbers duplicados. Se usará la última ocurrencia.`,
        variant: 'default'
      });
    }

    const { error } = await supabase
      .from('dealer_vehicle_inventory')
      .upsert(uniqueVehicles, {
        onConflict: 'dealer_id,stock_number'
      });

    if (error) {
      throw new Error(`Failed to upsert vehicles: ${error.message}`);
    }
  };

  // Helper: Log sync results to database
  const logSyncResults = async (logData: any): Promise<void> => {
    try {
      await supabase
        .from('dealer_inventory_sync_log')
        .insert(logData);
    } catch (error) {
      console.warn('⚠️ Could not save sync log (non-critical):', error);
      // Non-critical error, continue
    }
  };

  // Helper: Build sync log data
  const buildSyncLogData = (
    file: File,
    parseResult: any,
    processingResult: any,
    oldVehicleCount: number,
    fileTimestamp: Date | null,
    userId: string
  ) => {
    const removedVehicles = Math.max(0, oldVehicleCount - processingResult.vehicles.length);

    return {
      dealer_id: dealerId!,
      sync_type: 'csv_upload',
      sync_status: 'completed',
      records_processed: processingResult.stats.processed,
      records_added: processingResult.vehicles.length,
      records_updated: Math.min(processingResult.vehicles.length, oldVehicleCount),
      records_removed: removedVehicles,
      file_name: file.name,
      file_size: file.size,
      file_timestamp: fileTimestamp?.toISOString() || null,
      separator_detected: parseResult.separator,
      columns_mapped: JSON.stringify(Object.keys(parseResult.detectedColumns)),
      processing_logs: JSON.stringify(processingResult.logs.slice(-20)),
      processed_by: userId
    };
  };

  // Helper: Show success message
  const showSuccessMessage = (vehicleCount: number, removedCount: number, detectedColumns: string[]) => {
    const criticalDetected = ['year', 'make', 'model', 'trim', 'vin', 'stock_number']
      .filter(col => detectedColumns.includes(col));

    const columnsEmoji = criticalDetected.map(col => {
      const labels: Record<string, string> = {
        year: 'Year',
        make: 'Make',
        model: 'Model',
        trim: 'Trim',
        vin: 'VIN',
        stock_number: 'Stock#'
      };
      return `${labels[col]} ✅`;
    }).join(' ');

    const baseMessage = removedCount > 0
      ? `${vehicleCount} vehicles active (${removedCount} removed)`
      : `${vehicleCount} vehicles processed`;

    const message = `${baseMessage}\n${columnsEmoji}`;

    toast({
      title: t('common.success'),
      description: message,
      duration: 6000
    });
  };

  // Helper: Build success response
  const buildSuccessResponse = (
    parseResult: any,
    processingResult: any,
    fileTimestamp: Date | null
  ) => {
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
        logs: processingResult.logs.slice(-10)
      }
    };
  };

  // Helper: Handle no valid vehicles error
  const handleNoValidVehiclesError = (parseResult: any, processingResult: any) => {
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
  };

  // Main CSV upload function (refactored)
  const uploadCSV = useCallback(async (file: File): Promise<{ success: boolean; message: string; details?: any }> => {
    // Validate prerequisites
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

      // Step 1: Validate and read file
      const text = await validateCSVFile(file);

      // Step 2: Parse and process CSV
      const { parseCSV, processVehicleData, extractFileTimestamp, validateCriticalColumns } = await import('@/utils/csvUtils');
      const fileTimestamp = extractFileTimestamp(file.name);
      const parseResult = parseCSV(text);

      // Validate critical columns
      const validation = validateCriticalColumns(parseResult);

      console.log('📊 Parse results:', {
        separator: parseResult.separator,
        headers: parseResult.headers.length,
        rows: parseResult.rows.length,
        detectedColumns: Object.keys(parseResult.detectedColumns)
      });

      console.log('📋 Columnas detectadas:', validation.detectedColumns.join(', '));
      console.log('⚠️  Columnas críticas faltantes:', validation.missingColumns.length > 0 ? validation.missingColumns.join(', ') : 'Ninguna');
      console.log('❓ Headers no mapeados:', validation.unmappedHeaders.length > 0 ? validation.unmappedHeaders.slice(0, 5).join(', ') : 'Ninguno');

      // Warning if Model column is missing
      if (validation.missingColumns.includes('model')) {
        toast({
          title: t('common.warning', 'Advertencia'),
          description: 'El CSV no contiene columna "Model". Los vehículos tendrán este campo vacío.',
          variant: 'default'
        });
      }

      const processingResult = processVehicleData(parseResult, dealerId);

      console.log('🚗 Processing results:', processingResult.stats);
      processingResult.logs.forEach(log => {
        console.log(`[${log.step}] ${log.message}`, log.data || '');
      });

      // Step 3: Check if we have valid vehicles to process
      if (processingResult.vehicles.length === 0) {
        return handleNoValidVehiclesError(parseResult, processingResult);
      }

      // Step 4: Database operations
      console.log(`📤 Uploading ${processingResult.vehicles.length} vehicles to database...`);

      const oldVehicleCount = await getActiveVehicleCount(dealerId);
      console.log(`📊 Current active vehicles: ${oldVehicleCount}`);

      await deactivateExistingVehicles(dealerId);
      await upsertVehicles(processingResult.vehicles);

      // Step 5: Log sync results
      const syncLogData = buildSyncLogData(
        file,
        parseResult,
        processingResult,
        oldVehicleCount,
        fileTimestamp,
        user.id
      );
      await logSyncResults(syncLogData);

      // Step 6: Refresh data
      await queryClient.invalidateQueries({ queryKey: ['stock-inventory', dealerId] });

      // Step 7: Show success feedback
      const removedVehicles = Math.max(0, oldVehicleCount - processingResult.vehicles.length);
      console.log('✅ CSV upload completed successfully');
      console.log(`📦 Active inventory: ${processingResult.vehicles.length} vehicles (${removedVehicles} removed)`);

      showSuccessMessage(processingResult.vehicles.length, removedVehicles, validation.detectedColumns);

      return buildSuccessResponse(parseResult, processingResult, fileTimestamp);

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
