import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface SLAConfig {
  id: string;
  dealer_id: number;
  default_time_goal: number;
  max_time_goal: number;
  green_threshold: number;
  warning_threshold: number;
  danger_threshold: number;
  enable_notifications: boolean;
  notification_recipients: string[];
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
  count_weekends: boolean;
  count_business_hours_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepSLAConfig {
  id: string;
  sla_config_id: string;
  step_id: string;
  time_goal: number;
  green_threshold: number;
  warning_threshold: number;
  danger_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SLAConfigInput {
  default_time_goal: number;
  max_time_goal: number;
  green_threshold: number;
  warning_threshold: number;
  danger_threshold: number;
  enable_notifications?: boolean;
  notification_recipients?: string[];
  business_hours_start?: string;
  business_hours_end?: string;
  business_days?: number[];
  count_weekends?: boolean;
  count_business_hours_only?: boolean;
}

export interface StepSLAConfigInput {
  step_id: string;
  time_goal: number;
  green_threshold: number;
  warning_threshold: number;
  danger_threshold: number;
}

// Hook to fetch SLA config for a dealership
export function useGetReadySLAConfig(dealerId: number | undefined) {
  return useQuery({
    queryKey: ['get-ready-sla-config', dealerId],
    queryFn: async (): Promise<SLAConfig | null> => {
      if (!dealerId) {
        console.warn('No dealership selected for SLA config query');
        return null;
      }

      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .select('*')
        .eq('dealer_id', dealerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No config found, return null
          return null;
        }
        console.error('Error fetching SLA config:', error);
        throw error;
      }

      return data;
    },
    enabled: !!dealerId, // Only run query when dealerId is available
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Hook to fetch step-specific SLA configs
export function useStepSLAConfigs(slaConfigId: string | null) {
  return useQuery({
    queryKey: ['get-ready-step-sla-config', slaConfigId],
    queryFn: async (): Promise<StepSLAConfig[]> => {
      if (!slaConfigId) return [];

      const { data, error } = await supabase
        .from('get_ready_step_sla_config')
        .select('*')
        .eq('sla_config_id', slaConfigId)
        .order('created_at');

      if (error) {
        console.error('Error fetching step SLA configs:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!slaConfigId,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to manage SLA config mutations
export function useSLAConfigMutations(dealerId: number | undefined) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create or update main SLA config
  const upsertSLAConfig = useMutation({
    mutationFn: async (config: SLAConfigInput) => {
      if (!dealerId) {
        throw new Error('No dealership selected');
      }

      // Validate thresholds
      if (config.warning_threshold <= config.green_threshold) {
        throw new Error('Warning threshold must be greater than green threshold');
      }
      if (config.danger_threshold <= config.warning_threshold) {
        throw new Error('Danger threshold must be greater than warning threshold');
      }
      if (config.max_time_goal < config.default_time_goal) {
        throw new Error('Max time goal must be greater than or equal to default time goal');
      }

      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .upsert({
          dealer_id: dealerId,
          ...config,
        }, {
          onConflict: 'dealer_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-sla-config', dealerId] });
      toast({
        title: t('common.success'),
        description: 'SLA configuration updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating SLA config:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update SLA configuration',
        variant: 'destructive',
      });
    },
  });

  // Create or update step-specific SLA config
  const upsertStepSLAConfig = useMutation({
    mutationFn: async ({
      slaConfigId,
      config,
    }: {
      slaConfigId: string;
      config: StepSLAConfigInput;
    }) => {
      // Validate thresholds
      if (config.warning_threshold <= config.green_threshold) {
        throw new Error('Warning threshold must be greater than green threshold');
      }
      if (config.danger_threshold <= config.warning_threshold) {
        throw new Error('Danger threshold must be greater than warning threshold');
      }

      const { data, error } = await supabase
        .from('get_ready_step_sla_config')
        .upsert({
          sla_config_id: slaConfigId,
          ...config,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['get-ready-step-sla-config', variables.slaConfigId],
      });
      toast({
        title: t('common.success'),
        description: 'Step SLA configuration updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating step SLA config:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update step SLA configuration',
        variant: 'destructive',
      });
    },
  });

  // Delete step-specific SLA config
  const deleteStepSLAConfig = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('get_ready_step_sla_config')
        .delete()
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-step-sla-config'] });
      toast({
        title: t('common.success'),
        description: 'Step SLA configuration removed successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting step SLA config:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to delete step SLA configuration',
        variant: 'destructive',
      });
    },
  });

  return {
    upsertSLAConfig,
    upsertStepSLAConfig,
    deleteStepSLAConfig,
  };
}

// Helper function to get SLA status color
export function getSLAStatusColor(
  daysInStep: number,
  config: SLAConfig | null
): 'green' | 'yellow' | 'red' {
  if (!config) {
    // Default thresholds
    if (daysInStep <= 1) return 'green';
    if (daysInStep <= 3) return 'yellow';
    return 'red';
  }

  if (daysInStep <= config.green_threshold) return 'green';
  if (daysInStep <= config.warning_threshold) return 'yellow';
  return 'red';
}

// Helper function to get SLA status label
export function getSLAStatusLabel(
  daysInStep: number,
  config: SLAConfig | null
): string {
  const color = getSLAStatusColor(daysInStep, config);

  switch (color) {
    case 'green':
      return 'On Track';
    case 'yellow':
      return 'Warning';
    case 'red':
      return 'Critical';
    default:
      return 'Unknown';
  }
}
