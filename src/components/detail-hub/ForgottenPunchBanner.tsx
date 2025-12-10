import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export function ForgottenPunchBanner() {
  const navigate = useNavigate();
  const { selectedDealerId } = useDealerFilter();

  const { data: autoClosedCount = 0 } = useQuery({
    queryKey: ['auto-closed-punches-count', selectedDealerId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('detail_hub_time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('requires_supervisor_review', true)
          .eq('punch_out_method', 'auto_close')
          .is('verified_at', null);

        if (selectedDealerId !== 'all') {
          query = query.eq('dealership_id', selectedDealerId);
        }

        const { count, error } = await query;

        // If columns don't exist yet (migration not applied), silently return 0
        if (error) {
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            console.warn('[AutoClose] Database columns not yet created. Migration pending.');
            return 0;
          }
          throw error;
        }

        return count || 0;
      } catch (error) {
        console.error('[AutoClose] Error fetching auto-closed punches:', error);
        return 0; // Fail silently
      }
    },
    enabled: !!selectedDealerId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 60000, // Refresh every minute
    retry: false, // Don't retry if columns don't exist
  });

  if (autoClosedCount === 0) return null;

  return (
    <Alert variant="default" className="bg-amber-50 border-amber-200">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">
        {autoClosedCount} Auto-Closed Punch{autoClosedCount > 1 ? 'es' : ''} Requiring Review
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800">
          Time entries were automatically closed and need supervisor verification.
        </span>
        <Button
          onClick={() => navigate('/detail-hub/timecard?filter=auto_closed')}
          variant="outline"
          size="sm"
          className="border-amber-600 text-amber-900 hover:bg-amber-100"
        >
          Review Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
