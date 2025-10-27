import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { validateDealershipObject } from '@/utils/dealerValidation';
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
        console.warn('No dealership selected for approval count query');
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
          console.error('Error fetching vehicle approvals:', vehicleError);
          throw vehicleError;
        }

        console.log(`🔍 [Query 1] Vehicle-level approvals fetched:`, vehicleApprovals);
        console.log(`🔍 [Query 1] Total vehicles with requires_approval=true AND approval_status='pending': ${vehicleApprovals?.length || 0}`);

        // Create Set to track unique vehicle IDs (avoid double-counting)
        const vehicleIdsNeedingApproval = new Set<string>();

        // Filter vehicles: Only add if they have at least ONE work item that needs approval
        // A work item needs approval if: approval_required=true AND approval_status NOT IN ('declined', 'approved')
        vehicleApprovals?.forEach(v => {
          const workItemsNeedingApproval = (v.get_ready_work_items || []).filter(
            wi => wi.approval_required &&
                  wi.approval_status !== 'declined' &&
                  wi.approval_status !== 'approved'
          );

          if (workItemsNeedingApproval.length > 0) {
            vehicleIdsNeedingApproval.add(v.id);
            console.log(`🚗 [Vehicle-Level] Added vehicle: ${v.stock_number} (${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}) - ID: ${v.id}`);
            console.log(`   └─ requires_approval: ${v.requires_approval}, approval_status: ${v.approval_status}`);
            console.log(`   └─ Work items needing approval: ${workItemsNeedingApproval.length}`);
            workItemsNeedingApproval.forEach(wi => {
              console.log(`      • "${wi.title}" (approval_status: ${wi.approval_status || 'null'})`);
            });
          } else {
            console.log(`⏭️ [Skipped] Vehicle: ${v.stock_number} (${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model})`);
            console.log(`   └─ Reason: No work items needing approval (all were declined/approved)`);
            console.log(`   └─ Total work items: ${(v.get_ready_work_items || []).length}`);
            (v.get_ready_work_items || []).forEach(wi => {
              if (wi.approval_required) {
                console.log(`      • "${wi.title}" (approval_required: ${wi.approval_required}, approval_status: ${wi.approval_status})`);
              }
            });
          }
        });


        const totalCount = vehicleIdsNeedingApproval.size;

        console.log(`\n📊 [Approval Count] ========================================`);
        console.log(`   Total vehicles ACTUALLY needing approval: ${totalCount}`);
        console.log(`   - Vehicles with requires_approval=true fetched: ${vehicleApprovals?.length || 0}`);
        console.log(`   - Vehicles filtered (have active work items needing approval): ${totalCount}`);
        console.log(`   - Vehicles skipped (all work items declined/approved): ${(vehicleApprovals?.length || 0) - totalCount}`);

        // Debug: List all vehicles being counted
        console.log(`\n📋 [Summary] All ${totalCount} vehicles being counted:`);
        Array.from(vehicleIdsNeedingApproval).forEach((vehicleId, index) => {
          const vehicle = vehicleApprovals?.find(v => v.id === vehicleId);

          if (vehicle) {
            const workItemsNeedingApproval = (vehicle.get_ready_work_items || []).filter(
              wi => wi.approval_required &&
                    wi.approval_status !== 'declined' &&
                    wi.approval_status !== 'approved'
            );

            console.log(`   ${index + 1}. ${vehicle.stock_number} (${vehicle.vehicle_year} ${vehicle.vehicle_make} ${vehicle.vehicle_model})`);
            console.log(`      └─ Work items needing approval: ${workItemsNeedingApproval.length}`);
            workItemsNeedingApproval.forEach(wi => {
              console.log(`         • "${wi.title}" (approval_status: ${wi.approval_status || 'null'})`);
            });
          } else {
            console.log(`   ${index + 1}. ⚠️ Vehicle not found for ID: ${vehicleId}`);
          }
        });
        console.log(`========================================\n`);

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
