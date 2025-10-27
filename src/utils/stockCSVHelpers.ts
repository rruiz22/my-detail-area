/**
 * Stock CSV Upload Helper Utilities
 *
 * Extracted from useStockManagement for better modularity and testability.
 * These functions handle CSV validation, vehicle count tracking, and database operations.
 */

import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

/**
 * ✅ FIX SECURITY-01: Validate CSV file type and content
 */
export async function validateCSVFile(file: File): Promise<string> {
  // Validate file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv')) {
    throw new Error('Invalid file type. Please upload a CSV file (.csv extension required).');
  }

  // Validate MIME type (note: CSV can have multiple valid MIME types)
  const validMimeTypes = [
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
    'text/comma-separated-values'
  ];

  if (file.type && !validMimeTypes.includes(file.type)) {
    logger.dev(`File has unexpected MIME type: ${file.type}, but extension is .csv. Proceeding with caution.`);
  }

  // Validate file size (max 50MB)
  const maxSizeBytes = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSizeBytes) {
    throw new Error('File is too large. Maximum size is 50MB.');
  }

  if (file.size === 0) {
    throw new Error('File is empty (0 bytes).');
  }

  // Read and validate content
  const text = await file.text();
  if (!text.trim()) {
    throw new Error('CSV file has no content.');
  }

  // Basic CSV structure validation
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row.');
  }

  return text;
}

/**
 * Get current active vehicle count for a dealer
 */
export async function getActiveVehicleCount(dealerId: number): Promise<number> {
  const { count } = await supabase
    .from('dealer_vehicle_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('dealer_id', dealerId)
    .eq('is_active', true);

  return count || 0;
}

/**
 * Deactivate all existing vehicles for a dealer
 */
export async function deactivateExistingVehicles(dealerId: number): Promise<void> {
  logger.dev(`🔄 Marking existing vehicles as inactive for dealer ${dealerId}...`);
  const { error } = await supabase
    .from('dealer_vehicle_inventory')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('dealer_id', dealerId);

  if (error) {
    logger.dev('⚠️ Warning: Could not deactivate old vehicles:', error);
    // Non-critical error, continue
  }
}

/**
 * Upsert vehicles to database with deduplication
 */
export async function upsertVehicles(
  vehicles: any[],
  t: (key: string, fallback?: string) => string
): Promise<void> {
  // Deduplicate vehicles by stock_number (keep last occurrence)
  const deduplicatedMap = new Map();
  vehicles.forEach(vehicle => {
    deduplicatedMap.set(vehicle.stock_number, vehicle);
  });

  const uniqueVehicles = Array.from(deduplicatedMap.values());
  const duplicateCount = vehicles.length - uniqueVehicles.length;

  if (duplicateCount > 0) {
    logger.dev(`⚠️ Found ${duplicateCount} duplicate stock numbers - using latest occurrence`);
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
}

/**
 * Log sync results to database
 */
export async function logSyncResults(logData: any): Promise<void> {
  try {
    await supabase
      .from('dealer_inventory_sync_log')
      .insert(logData);
  } catch (error) {
    logger.dev('⚠️ Could not save sync log (non-critical):', error);
    // Non-critical error, continue
  }
}

/**
 * Build sync log data object
 */
export function buildSyncLogData(
  file: File,
  parseResult: any,
  processingResult: any,
  oldVehicleCount: number,
  fileTimestamp: Date | null,
  userId: string,
  dealerId: number
) {
  const removedVehicles = Math.max(0, oldVehicleCount - processingResult.vehicles.length);

  return {
    dealer_id: dealerId,
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
}

/**
 * Show success message with detected columns
 */
export function showSuccessMessage(
  vehicleCount: number,
  removedCount: number,
  detectedColumns: string[],
  t: (key: string, fallback?: string) => string
) {
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
}

/**
 * Build success response object
 */
export function buildSuccessResponse(
  parseResult: any,
  processingResult: any,
  fileTimestamp: Date | null
) {
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
}

/**
 * Handle no valid vehicles error
 */
export function handleNoValidVehiclesError(
  parseResult: any,
  processingResult: any,
  t: (key: string, fallback?: string) => string
) {
  const errorMessage = `No valid vehicles found. Processed ${processingResult.stats.processed} rows but none had required fields (stock_number AND vin).`;

  logger.error('❌ No valid vehicles:', {
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
