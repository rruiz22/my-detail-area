import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  trim?: string;
  vehicleType?: string;
  bodyClass?: string;
  source?: string; // Track which API was used
}

interface NHTSAApiItem {
  Variable: string;
  Value: string | null;
}

// Optional: Get Vincario API key from environment (if available)
const VINCARIO_API_KEY = Deno.env.get('VINCARIO_API_KEY');

/**
 * Decode VIN using NHTSA vPIC API (Primary - Free, Unlimited)
 */
async function decodeVinNHTSA(vin: string): Promise<VehicleInfo | null> {
  console.log('Trying NHTSA API...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      return null;
    }

    // Extract vehicle information
    const vehicleInfo: VehicleInfo = {
      year: '',
      make: '',
      model: '',
      trim: '',
      vehicleType: '',
      bodyClass: '',
      source: 'NHTSA'
    };

    data.Results.forEach((item: NHTSAApiItem) => {
      switch (item.Variable) {
        case 'Model Year':
          vehicleInfo.year = item.Value || '';
          break;
        case 'Make':
          vehicleInfo.make = item.Value || '';
          break;
        case 'Model':
          vehicleInfo.model = item.Value || '';
          break;
        case 'Trim':
        case 'Series':
          if (item.Value && item.Value !== 'Not Applicable') {
            vehicleInfo.trim = item.Value;
          }
          break;
        case 'Vehicle Type':
          vehicleInfo.vehicleType = item.Value || '';
          break;
        case 'Body Class':
          vehicleInfo.bodyClass = item.Value || '';
          break;
      }
    });

    // Validate required fields
    if (!vehicleInfo.year || !vehicleInfo.make || !vehicleInfo.model) {
      console.log('NHTSA returned incomplete data:', vehicleInfo);
      return null;
    }

    console.log('✅ NHTSA decode successful');
    return vehicleInfo;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('NHTSA API failed:', error.message);
    return null;
  }
}

/**
 * Decode VIN using Vincario API (Fallback - 20 free/month with API key)
 * Requires VINCARIO_API_KEY environment variable
 */
async function decodeVinVincario(vin: string): Promise<VehicleInfo | null> {
  if (!VINCARIO_API_KEY) {
    console.log('⚠️ Vincario API key not configured, skipping fallback');
    return null;
  }

  console.log('Trying Vincario API (fallback)...');

  try {
    const response = await fetch(
      `https://api.vindecoder.eu/3.2/${VINCARIO_API_KEY}/decode/${vin}.json`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Vincario API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if decode was successful
    if (!data.decode || data.decode.length === 0) {
      return null;
    }

    const decoded = data.decode[0];

    const vehicleInfo: VehicleInfo = {
      year: decoded.years?.[0]?.toString() || '',
      make: decoded.make || '',
      model: decoded.model || '',
      trim: decoded.trim || '',
      vehicleType: decoded.vehicle_type || '',
      bodyClass: decoded.body || '',
      source: 'Vincario'
    };

    // Validate required fields
    if (!vehicleInfo.year || !vehicleInfo.make || !vehicleInfo.model) {
      console.log('Vincario returned incomplete data:', vehicleInfo);
      return null;
    }

    console.log('✅ Vincario decode successful (fallback used)');
    return vehicleInfo;

  } catch (error) {
    console.error('Vincario API failed:', error.message);
    return null;
  }
}

/**
 * Main handler with cascading fallback
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();

    if (!vin || vin.length !== 17) {
      return new Response(
        JSON.stringify({ error: 'Invalid VIN. Must be exactly 17 characters.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Decoding VIN: ${vin}`);

    // Try NHTSA first (primary, free, unlimited)
    let vehicleInfo = await decodeVinNHTSA(vin);

    // If NHTSA failed, try Vincario fallback
    if (!vehicleInfo) {
      console.log('⚠️ NHTSA failed, attempting fallback...');
      vehicleInfo = await decodeVinVincario(vin);
    }

    // If all APIs failed
    if (!vehicleInfo) {
      const errorMessage = VINCARIO_API_KEY
        ? 'All VIN decode services are currently unavailable. Please try again later or enter vehicle details manually.'
        : 'NHTSA VIN decode service is currently unavailable. Please try again later or enter vehicle details manually.';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          hint: 'Add VINCARIO_API_KEY to enable fallback API (20 free decodes/month)'
        }),
        {
          status: 503, // Service Unavailable
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format consolidated vehicle info
    const formattedInfo = vehicleInfo.trim
      ? `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.trim})`
      : `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;

    const result = {
      vin,
      year: vehicleInfo.year,
      make: vehicleInfo.make,
      model: vehicleInfo.model,
      trim: vehicleInfo.trim || '',
      vehicleInfo: formattedInfo,
      vehicleType: vehicleInfo.vehicleType,
      bodyClass: vehicleInfo.bodyClass,
      source: vehicleInfo.source, // Indicates which API was used
      success: true
    };

    console.log(`✅ VIN decoded successfully via ${vehicleInfo.source}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in decode-vin function:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to decode VIN. Please try again or enter vehicle details manually.',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
