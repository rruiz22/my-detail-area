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
}

interface NHTSAApiItem {
  Variable: string;
  Value: string | null;
}

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

    console.log(`Decoding VIN: ${vin}`);
    
    // Use NHTSA free API for VIN decoding
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('NHTSA Response:', JSON.stringify(data, null, 2));

    if (!data.Results || data.Results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Unable to decode VIN. Please verify the VIN is correct.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract vehicle information from NHTSA response
    const results = data.Results;
    const vehicleInfo: VehicleInfo = {
      year: '',
      make: '',
      model: '',
      trim: '',
      vehicleType: '',
      bodyClass: ''
    };

    // Map NHTSA fields to our structure
    results.forEach((item: NHTSAApiItem) => {
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
      console.log('Missing required fields:', vehicleInfo);
      return new Response(
        JSON.stringify({ 
          error: 'Incomplete vehicle information from VIN. Please enter vehicle details manually.',
          partial: vehicleInfo
        }),
        { 
          status: 400,
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
      success: true
    };

    console.log('Decoded vehicle info:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in decode-vin function:', error);
    
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