import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { validateDealershipObject } from '@/utils/dealerValidation';
import { logger } from '@/utils/logger';
import { workItemNeedsApproval } from '@/utils/approvalHelpers';
import { useQuery } from '@tanstack/react-query';

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
        logger.warn('no-dealership-selected', { context: 'approval-count-query' });
        return 0;
      }

      try {
        // Query: Get ALL vehicles with requires_approval=true AND approval_status='pending'
        // AND their work items to validate if they actually need approval
        const { data: vehicleApprovals, error: vehicleError } = await supabase
          .from('get_ready_vehicles')
          .select(`
            id,
            stock_number,
            vehicle_year,
            vehicle_make,
            vehicle_model,
            requires_approval,
            approval_status,
            get_ready_work_items (
              id,
              title,
              approval_required,
              approval_status
            )
          `)
          .eq('dealer_id', dealerId)
          .eq('requires_approval', true)
          .eq('approval_status', 'pending')
          .is('deleted_at', null);

        if (vehicleError) {
          logger.error('fetch-vehicle-approvals-error', vehicleError);
          throw vehicleError;
        }

        logger.debug('vehicle-approvals-fetched', {
          count: vehicleApprovals?.length || 0,
          dealerId
        });

        // Create Set to track unique vehicle IDs (avoid double-counting)
        const vehicleIdsNeedingApproval = new Set<string>();

        // Filter vehicles: Only add if they have at least ONE work item that needs approval
        // Using centralized approval logic from approvalHelpers
        vehicleApprovals?.forEach(v => {
          const workItemsNeedingApproval = (v.get_ready_work_items || []).filter(workItemNeedsApproval);

          if (workItemsNeedingApproval.length > 0) {
            vehicleIdsNeedingApproval.add(v.id);
            logger.debug('vehicle-added-to-approval-count', {
              vehicleId: v.id,
              stockNumber: v.stock_number,
              vehicle: `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`,
              requiresApproval: v.requires_approval,
              approvalStatus: v.approval_status,
              workItemsNeedingApproval: workItemsNeedingApproval.length,
              workItems: workItemsNeedingApproval.map(wi => ({
                title: wi.title,
                approvalStatus: wi.approval_status || 'null'
              }))
            });
          } else {
            logger.debug('vehicle-skipped-no-pending-approvals', {
              stockNumber: v.stock_number,
              vehicle: `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`,
              totalWorkItems: (v.get_ready_work_items || []).length,
              reason: 'all work items declined/approved'
            });
          }
        });


        const totalCount = vehicleIdsNeedingApproval.size;

        logger.debug('approval-count-summary', {
          totalCount,
          vehiclesFetched: vehicleApprovals?.length || 0,
          vehiclesFiltered: totalCount,
          vehiclesSkipped: (vehicleApprovals?.length || 0) - totalCount,
          vehicleDetails: Array.from(vehicleIdsNeedingApproval).map(vehicleId => {
            const vehicle = vehicleApprovals?.find(v => v.id === vehicleId);
            if (vehicle) {
              const workItemsNeedingApproval = (vehicle.get_ready_work_items || []).filter(workItemNeedsApproval);
              return {
                stockNumber: vehicle.stock_number,
                vehicle: `${vehicle.vehicle_year} ${vehicle.vehicle_make} ${vehicle.vehicle_model}`,
                workItemsCount: workItemsNeedingApproval.length,
                workItems: workItemsNeedingApproval.map(wi => ({
                  title: wi.title,
                  approvalStatus: wi.approval_status || 'null'
                }))
              };
            }
            return { error: 'Vehicle not found', vehicleId };
          })
        });

        return totalCount;
      } catch (error) {
        logger.error('approval-count-calculation-error', error);
        return 0;
      }
    },
    enabled: !!dealerId,
    staleTime: 1000 * 30, // 30 seconds - balance between freshness and performance
    refetchInterval: 1000 * 60, // Refetch every minute to keep count updated
  });
}
