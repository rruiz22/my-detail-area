import { useQuery } from '@tanstack/react-query';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { validateDealershipObject } from '@/utils/dealerValidation';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized hook to count vehicles needing approval
 *
 * This hook provides an accurate count of vehicles requiring approval without
 * loading full vehicle objects, making it highly efficient for badge counts.
 *
 * Counts two types of approvals:
 * 1. Vehicle-level: vehicles with requires_approval=true and approval_status='pending'
 * 2. Work item-level: vehicles with work items that have approval_required=true
 *    and approval_status != 'approved'
 *
 * @returns {number} Total count of unique vehicles needing approval
 */
export function useGetReadyApprovalCount() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useQuery({
    queryKey: ['get-ready-approvals-count', dealerId],
    queryFn: async () => {
      if (!dealerId) {
        console.warn('No dealership selected for approval count query');
        return 0;
      }

      try {
        // Query 1: Count vehicles with vehicle-level approval pending
        const { data: vehicleApprovals, error: vehicleError } = await supabase
          .from('get_ready_vehicles')
          .select('id')
          .eq('dealer_id', dealerId)
          .eq('requires_approval', true)
          .eq('approval_status', 'pending')
          .is('deleted_at', null);

        if (vehicleError) {
          console.error('Error fetching vehicle approvals:', vehicleError);
          throw vehicleError;
        }

        // Create Set to track unique vehicle IDs (avoid double-counting)
        const vehicleIdsNeedingApproval = new Set<string>();

        // Add vehicle-level approvals to Set
        vehicleApprovals?.forEach(v => vehicleIdsNeedingApproval.add(v.id));

        // Query 2: Get vehicles with work items needing approval
        // Work items need approval if: approval_required = true AND approval_status != 'approved'
        const { data: workItemApprovals, error: workItemError } = await supabase
          .from('get_ready_vehicles')
          .select(`
            id,
            get_ready_work_items!inner (
              id,
              approval_required,
              approval_status
            )
          `)
          .eq('dealer_id', dealerId)
          .eq('get_ready_work_items.approval_required', true)
          .is('deleted_at', null);

        if (workItemError) {
          console.error('Error fetching work item approvals:', workItemError);
          throw workItemError;
        }

        // Filter vehicles that have at least one work item needing approval
        // ✅ CORRECTED: Work item needs approval if approval_status is null,
        // but NOT if it's 'approved' or 'declined' (rejected)
        workItemApprovals?.forEach(vehicle => {
          const hasWorkItemsNeedingApproval = (vehicle.get_ready_work_items as any[])?.some(
            item => !item.approval_status || (
              item.approval_status !== 'approved' &&
              item.approval_status !== 'declined'  // Exclude rejected work items
            )
          );

          if (hasWorkItemsNeedingApproval) {
            vehicleIdsNeedingApproval.add(vehicle.id);
          }
        });

        const totalCount = vehicleIdsNeedingApproval.size;

        console.log(`📊 [Approval Count] Total vehicles needing approval: ${totalCount}`);
        console.log(`   - Vehicle-level approvals: ${vehicleApprovals?.length || 0}`);
        console.log(`   - Vehicles with work items needing approval: ${vehicleIdsNeedingApproval.size - (vehicleApprovals?.length || 0)}`);

        return totalCount;
      } catch (error) {
        console.error('Error calculating approval count:', error);
        return 0;
      }
    },
    enabled: !!dealerId,
    staleTime: 1000 * 30, // 30 seconds - balance between freshness and performance
    refetchInterval: 1000 * 60, // Refetch every minute to keep count updated
  });
}
