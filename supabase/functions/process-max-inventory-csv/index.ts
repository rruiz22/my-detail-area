import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.168.0/encoding/csv.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  dealerId: number;
  filePath: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { dealerId, filePath } = await req.json() as SyncRequest;

    console.log(`[Dealer ${dealerId}] Processing CSV from ${filePath}`);

    // Step 1: Download CSV from Storage
    const bucketName = Deno.env.get('SUPABASE_BUCKET_NAME') || 'dealer-inventory-imports';
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download CSV: ${downloadError.message}`);
    }

    console.log(`[Dealer ${dealerId}] CSV downloaded, size: ${fileData.size} bytes`);

    // Step 2: Parse CSV
    const csvText = await fileData.text();
    const records = await parse(csvText, {
      skipFirstRow: true,
      columns: undefined, // Let parser detect columns
    });

    console.log(`[Dealer ${dealerId}] Parsed ${records.length} records`);

    if (records.length === 0) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Step 3: Map CSV columns to database fields
    const vehicles = records.map((row: any) => mapCsvToVehicle(row, dealerId));

    console.log(`[Dealer ${dealerId}] Mapped ${vehicles.length} vehicles`);

    // Step 4: Validate required fields
    const validVehicles = vehicles.filter((v) => v.stock_number && v.vin);
    const invalidCount = vehicles.length - validVehicles.length;

    if (invalidCount > 0) {
      console.warn(`[Dealer ${dealerId}] ${invalidCount} vehicles missing required fields (stock_number or VIN)`);
    }

    // Step 5: Deactivate existing vehicles
    console.log(`[Dealer ${dealerId}] Deactivating existing vehicles`);
    const { error: deactivateError } = await supabaseClient
      .from('dealer_vehicle_inventory')
      .update({ is_active: false })
      .eq('dealer_id', dealerId);

    if (deactivateError) {
      throw new Error(`Failed to deactivate vehicles: ${deactivateError.message}`);
    }

    // Step 6: Upsert new vehicles
    console.log(`[Dealer ${dealerId}] Upserting ${validVehicles.length} vehicles`);
    const { data: upsertedVehicles, error: upsertError } = await supabaseClient
      .from('dealer_vehicle_inventory')
      .upsert(validVehicles, {
        onConflict: 'dealer_id,stock_number',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      throw new Error(`Failed to upsert vehicles: ${upsertError.message}`);
    }

    // Step 7: Create sync log
    console.log(`[Dealer ${dealerId}] Creating sync log`);
    await supabaseClient.from('dealer_inventory_sync_log').insert({
      dealer_id: dealerId,
      sync_type: 'auto_dms_sync',
      sync_status: 'completed',
      sync_started_at: new Date().toISOString(),
      sync_completed_at: new Date().toISOString(),
      records_processed: validVehicles.length,
      records_added: upsertedVehicles?.length || 0,
      records_updated: 0, // TODO: Track this
      file_name: filePath.split('/').pop(),
      file_size: fileData.size,
      separator_detected: ',',
      columns_mapped: Object.keys(validVehicles[0] || {}),
    });

    const result = {
      success: true,
      dealerId,
      recordsProcessed: validVehicles.length,
      recordsInvalid: invalidCount,
      recordsUpserted: upsertedVehicles?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Dealer ${dealerId}] Processing completed:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing CSV:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Map CSV row to vehicle database record
 */
function mapCsvToVehicle(row: any, dealerId: number): any {
  // Flexible column mapping (case-insensitive, handles various formats)
  const getValue = (possibleKeys: string[]): any => {
    for (const key of possibleKeys) {
      const exactMatch = row[key];
      if (exactMatch !== undefined) return exactMatch;

      // Try case-insensitive match
      const lowerKey = key.toLowerCase();
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase() === lowerKey) {
          return row[rowKey];
        }
      }
    }
    return null;
  };

  const parseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/[,$]/g, ''));
    return isNaN(num) ? null : num;
  };

  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1' || str === 'yes';
  };

  return {
    dealer_id: dealerId,
    stock_number: getValue(['Stock Number', 'StockNumber', 'Stock #', 'stock_number', 'stocknumber']),
    vin: getValue(['VIN', 'vin', 'Vehicle Identification Number']),
    year: parseNumber(getValue(['Year', 'year', 'Model Year'])),
    make: getValue(['Make', 'make', 'Manufacturer']),
    model: getValue(['Model', 'model']),
    trim: getValue(['Trim', 'trim', 'Trim Level']),
    color: getValue(['Color', 'color', 'Exterior Color', 'Ext Color']),
    mileage: parseNumber(getValue(['Mileage', 'mileage', 'Odometer', 'Miles'])),
    price: parseNumber(getValue(['Price', 'price', 'Asking Price', 'Sale Price'])),
    msrp: parseNumber(getValue(['MSRP', 'msrp', 'List Price']),
    dms_status: getValue(['Status', 'status', 'DMS Status', 'Vehicle Status']),
    age_days: parseNumber(getValue(['Age', 'age', 'Days in Stock', 'Age Days', 'age_days'])),
    is_active: true,
    is_certified: parseBoolean(getValue(['Certified', 'certified', 'CPO', 'Is Certified'])),
    lot_location: getValue(['Location', 'location', 'Lot Location', 'Lot']),
    drivetrain: getValue(['Drivetrain', 'drivetrain', 'Drive']),
    segment: getValue(['Segment', 'segment', 'Category']),
    raw_data: row, // Store entire row for unmapped fields
    updated_at: new Date().toISOString(),
  };
}
