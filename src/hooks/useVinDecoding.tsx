import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  trim?: string;
  vehicleInfo: string;
  vehicleType?: string;
  bodyClass?: string;
}

interface UseVinDecodingReturn {
  decodeVin: (vin: string) => Promise<VehicleInfo | null>;
  loading: boolean;
  error: string | null;
}

export function useVinDecoding(): UseVinDecodingReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodeVin = async (vin: string): Promise<VehicleInfo | null> => {
    if (!vin || vin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('decode-vin', {
        body: { vin: vin.toUpperCase() }
      });

      if (functionError) {
        console.error('VIN decoding function error:', functionError);
        setError('Failed to decode VIN. Please enter vehicle details manually.');
        return null;
      }

      if (data.error) {
        setError(data.error);
        return data.partial || null;
      }

      return {
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim || '',
        vehicleInfo: data.vehicleInfo,
        vehicleType: data.vehicleType || '',
        bodyClass: data.bodyClass || ''
      };
    } catch (err) {
      console.error('VIN decoding error:', err);
      setError('Network error. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    decodeVin,
    loading,
    error
  };
}