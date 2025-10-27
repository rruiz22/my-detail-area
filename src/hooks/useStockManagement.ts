import { STOCK_CONSTANTS } from '@/constants/stock';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import { orderEvents } from '@/utils/eventBus';
import { logger } from '@/utils/logger';
import {
    buildSuccessResponse,
    buildSyncLogData,
    deactivateExistingVehicles,
    getActiveVehicleCount,
    handleNoValidVehiclesError,
    logSyncResults,
    showSuccessMessage,
    upsertVehicles,
    validateCSVFile
} from '@/utils/stockCSVHelpers';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Vehicle Inventory Interface
 * Represents a complete vehicle record in the dealer's inventory
 *
 * @property {string} id - Unique identifier for the vehicle record
 * @property {number} dealer_id - Associated dealership ID
 * @property {string} stock_number - Dealer's internal stock number (required)
 * @property {string} vin - Vehicle Identification Number (required)
 * @property {number} [year] - Manufacturing year
 * @property {string} [make] - Vehicle manufacturer (e.g., Toyota, Ford)
 * @property {string} [model] - Vehicle model (e.g., Camry, F-150)
 * @property {string} [trim] - Trim level (e.g., LE, XLT)
 * @property {number} [price] - Current listing price
 * @property {number} [age_days] - Days in inventory
 * @property {string} [dms_status] - DMS status (available, sold, pending, etc.)
 */
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
        logger.dev('No dealership selected for inventory query');
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from('dealer_vehicle_inventory')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        logger.error('Error fetching inventory:', fetchError);
        throw fetchError;
      }

      return data || [];
    },
    enabled: !!dealerId, // Only enable query when dealerId is provided
    interval: STOCK_CONSTANTS.POLLING.INTERVAL,
    staleTime: STOCK_CONSTANTS.POLLING.STALE_TIME,
  });

  // Derive inventory from query data using useMemo for silent updates
  const inventory = useMemo(() => {
    return inventoryQuery.data || [];
  }, [inventoryQuery.data]);

  const refreshInventory = useCallback(async () => {
    if (!dealerId) return;
    await queryClient.invalidateQueries({ queryKey: ['stock-inventory', dealerId] });
  }, [dealerId, queryClient]);

  // ✅ FIX QUALITY-01: Integrate EventBus for inter-component communication
  useEffect(() => {
    const unsubscribe = orderEvents.on('inventoryUpdated', () => {
      logger.dev('📦 EventBus: Inventory updated, refreshing...');
      refreshInventory();
    });

    return unsubscribe;
  }, [refreshInventory]);

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

  // ✅ FIX ARCH-02: CSV helpers extracted to src/utils/stockCSVHelpers.ts

  // Main CSV upload function (refactored)
  const uploadCSV = useCallback(async (file: File): Promise<{ success: boolean; message: string; details?: any }> => {
    // ✅ FIX SECURITY-02: Robust validation of prerequisites
    if (!user) {
      const errorMsg = 'User authentication required';
      logger.error('❌ ' + errorMsg);
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, message: errorMsg };
    }

    if (!dealerId || !Number.isInteger(dealerId) || dealerId <= 0 || dealerId > Number.MAX_SAFE_INTEGER) {
      const errorMsg = 'Invalid or missing dealership ID';
      logger.error('❌ Invalid dealerId for CSV upload:', { dealerId, type: typeof dealerId });
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, message: errorMsg };
    }

    try {
      logger.dev(`🔄 Starting CSV upload: ${file.name} (${file.size} bytes)`);

      // Step 1: Validate and read file
      const text = await validateCSVFile(file);

      // Step 2: Parse and process CSV
      const { parseCSV, processVehicleData, extractFileTimestamp, validateCriticalColumns } = await import('@/utils/csvUtils');
      const fileTimestamp = extractFileTimestamp(file.name);
      const parseResult = parseCSV(text);

      // Validate critical columns
      const validation = validateCriticalColumns(parseResult);

      logger.dev('📊 Parse results:', {
        separator: parseResult.separator,
        headers: parseResult.headers.length,
        rows: parseResult.rows.length,
        detectedColumns: Object.keys(parseResult.detectedColumns)
      });

      logger.dev('📋 Columnas detectadas:', validation.detectedColumns.join(', '));
      logger.dev('⚠️  Columnas críticas faltantes:', validation.missingColumns.length > 0 ? validation.missingColumns.join(', ') : 'Ninguna');
      logger.dev('❓ Headers no mapeados:', validation.unmappedHeaders.length > 0 ? validation.unmappedHeaders.slice(0, 5).join(', ') : 'Ninguno');

      // Warning if Model column is missing
      if (validation.missingColumns.includes('model')) {
        toast({
          title: t('common.warning', 'Advertencia'),
          description: 'El CSV no contiene columna "Model". Los vehículos tendrán este campo vacío.',
          variant: 'default'
        });
      }

      const processingResult = processVehicleData(parseResult, dealerId);

      logger.dev('🚗 Processing results:', processingResult.stats);
      processingResult.logs.forEach(log => {
        logger.dev(`[${log.step}] ${log.message}`, log.data || '');
      });

      // Step 3: Check if we have valid vehicles to process
      if (processingResult.vehicles.length === 0) {
        return handleNoValidVehiclesError(parseResult, processingResult, t);
      }

      // Step 4: Database operations
      logger.dev(`📤 Uploading ${processingResult.vehicles.length} vehicles to database...`);

      const oldVehicleCount = await getActiveVehicleCount(dealerId);
      logger.dev(`📊 Current active vehicles: ${oldVehicleCount}`);

      await deactivateExistingVehicles(dealerId);
      await upsertVehicles(processingResult.vehicles, t);

      // Step 5: Log sync results
      const syncLogData = buildSyncLogData(
        file,
        parseResult,
        processingResult,
        oldVehicleCount,
        fileTimestamp,
        user.id,
        dealerId
      );
      await logSyncResults(syncLogData);

      // Step 6: Refresh data
      await queryClient.invalidateQueries({ queryKey: ['stock-inventory', dealerId] });

      // Step 7: Show success feedback
      const removedVehicles = Math.max(0, oldVehicleCount - processingResult.vehicles.length);
      logger.dev('✅ CSV upload completed successfully');
      logger.dev(`📦 Active inventory: ${processingResult.vehicles.length} vehicles (${removedVehicles} removed)`);

      showSuccessMessage(processingResult.vehicles.length, removedVehicles, validation.detectedColumns, t);

      // ✅ FIX QUALITY-01: Emit event to notify other components
      orderEvents.emit('inventoryUpdated', {
        dealerId,
        vehicleCount: processingResult.vehicles.length,
        removedCount: removedVehicles
      });

      return buildSuccessResponse(parseResult, processingResult, fileTimestamp);

    } catch (err) {
      logger.error('💥 Error uploading CSV:', err);
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
