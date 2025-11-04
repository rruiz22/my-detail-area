import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

interface SenderInfo {
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
}

/**
 * React Query hook to fetch and cache sender information from system settings
 * - Uses VERY_LONG cache time (30 min) as this is rarely changing system data
 * - Returns sender info including company name displayed on reports and dashboard
 * - Falls back to default "My Detail Area" if not configured
 */
export const useSenderInfo = () => {
  return useQuery<SenderInfo, Error>({
    queryKey: ['sender-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'sender_info')
        .single();

      if (error) {
        // If sender info is not configured, return default
        console.warn('Sender info not found in system_settings, using defaults');
        return {
          company_name: 'My Detail Area',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          phone: '',
          email: '',
          website: ''
        };
      }

      // Parse the setting_value JSON and ensure company_name exists
      const senderInfo = data?.setting_value as SenderInfo;
      return {
        company_name: senderInfo?.company_name || 'My Detail Area',
        address: senderInfo?.address || '',
        city: senderInfo?.city || '',
        state: senderInfo?.state || '',
        zip_code: senderInfo?.zip_code || '',
        phone: senderInfo?.phone || '',
        email: senderInfo?.email || '',
        website: senderInfo?.website || ''
      };
    },
    staleTime: CACHE_TIMES.VERY_LONG, // 30 minutes - system config data
    gcTime: GC_TIMES.VERY_LONG, // 1 hour
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
