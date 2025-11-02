import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface SenderInfo {
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
}

const defaultSenderInfo: SenderInfo = {
  company_name: 'Dealer Detail Service',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  website: ''
};

export const useSenderInfo = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['senderInfo'],
    queryFn: async (): Promise<SenderInfo> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'sender_info')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching sender info:', error);
        throw error;
      }

      const savedInfo = data?.setting_value as Partial<SenderInfo> | undefined;

      return {
        company_name: savedInfo?.company_name || 'Dealer Detail Service',
        address: savedInfo?.address || '',
        city: savedInfo?.city || '',
        state: savedInfo?.state || '',
        zip_code: savedInfo?.zip_code || '',
        phone: savedInfo?.phone || '',
        email: savedInfo?.email || '',
        website: savedInfo?.website || '',
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
  });

  return {
    senderInfo: data || defaultSenderInfo,
    loading: isLoading,
    error,
  };
};
