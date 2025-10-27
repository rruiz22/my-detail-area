import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import type { ApprovalHistoryItem } from '@/types/approvals';
import { validateDealershipObject } from '@/utils/dealerValidation';
import { useQuery } from '@tanstack/react-query';
import { useApprovalFilters } from './useApprovalFilters';

/**
 * Normalize dateRange to ensure from/to are Date objects
 * Defensive programming to handle corrupted localStorage data
 */
function normalizeDateRange(dateRange: { from: Date | string; to: Date | string; preset: string }) {
  let from = dateRange.from;
  let to = dateRange.to;

  // Convert strings to Date objects if needed
  if (typeof from === 'string') {
    from = new Date(from);
    if (isNaN(from.getTime())) {
      // Invalid date, use default (90 days ago)
      from = new Date();
      from.setDate(from.getDate() - 90);
    }
  }

  if (typeof to === 'string') {
    to = new Date(to);
    if (isNaN(to.getTime())) {
      // Invalid date, use default (today)
      to = new Date();
    }
  }

  return { from, to };
}

/**
 * Fetch historical approval data (last 90 days by default, filterable)
 */
export function useApprovalHistory() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);
  const filters = useApprovalFilters();

  return useQuery({
    queryKey: ['approval-history', dealerId, filters.dateRange, filters.statuses, filters.searchQuery],
    queryFn: async () => {
      if (!dealerId) {
        return [];
      }

      try {
        // Build the query with FK joins to profiles table
        let query = supabase
          .from('get_ready_vehicles')
          .select(`
            id,
            stock_number,
            vin,
            vehicle_year,
            vehicle_make,
            vehicle_model,
            approval_status,
            approved_at,
            approved_by,
            approval_notes,
            rejected_at,
            rejected_by,
            rejection_reason,
            intake_date,
            get_ready_work_items (
              id,
              title,
              work_type,
              estimated_cost,
              approval_status,
              approval_required
            ),
            approver:approved_by (
              first_name,
              last_name,
              email
            ),
            rejector:rejected_by (
              first_name,
              last_name,
              email
            )
          `)
          .eq('dealer_id', dealerId)
          .is('deleted_at', null);

        // Filter by approval status
        if (filters.statuses.length > 0 && filters.statuses.length < 3) {
          query = query.in('approval_status', filters.statuses);
        }

        // Filter by date range - DEFENSIVE: normalize dates first
        const { from, to } = normalizeDateRange(filters.dateRange);
        const fromDate = from.toISOString();
        const toDate = to.toISOString();

        // For approved vehicles, check approved_at; for rejected, check rejected_at
        query = query.or(`approved_at.gte.${fromDate},rejected_at.gte.${fromDate}`);
        query = query.or(`approved_at.lte.${toDate},rejected_at.lte.${toDate}`);

        // Execute query
        const { data, error } = await query;

        if (error) {
          console.error('Error fetching approval history:', error);
          throw error;
        }

        // Transform data into ApprovalHistoryItem format
        const historyItems: ApprovalHistoryItem[] = (data || [])
          .filter(vehicle =>
            vehicle.approval_status === 'approved' ||
            vehicle.approval_status === 'rejected'
          )
          .map(vehicle => {
            const isApproved = vehicle.approval_status === 'approved';
            const actionDate = isApproved ? vehicle.approved_at : vehicle.rejected_at;
            const approverId = isApproved ? vehicle.approved_by : vehicle.rejected_by;
            const approverData = isApproved ? vehicle.approver : vehicle.rejector;

            // Build full name from first_name and last_name
            const approverFullName = approverData
              ? [approverData.first_name, approverData.last_name]
                  .filter(Boolean)
                  .join(' ') || 'Unknown'
              : 'Unknown';

            // Calculate time to approval (from intake to decision)
            const intakeDate = new Date(vehicle.intake_date);
            const decisionDate = new Date(actionDate || vehicle.intake_date);
            const timeToApprovalHours = Math.round(
              (decisionDate.getTime() - intakeDate.getTime()) / (1000 * 60 * 60)
            );

            // Calculate costs
            const workItems = vehicle.get_ready_work_items || [];
            const estimatedCost = workItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

            return {
              id: vehicle.id,
              vehicle_id: vehicle.id,
              stock_number: vehicle.stock_number,
              vehicle_year: vehicle.vehicle_year,
              vehicle_make: vehicle.vehicle_make,
              vehicle_model: vehicle.vehicle_model,
              vin: vehicle.vin,
              approval_status: vehicle.approval_status as 'approved' | 'rejected',
              action_date: actionDate || vehicle.intake_date,
              approver_id: approverId || 'unknown',
              approver_name: approverFullName,
              approver_email: approverData?.email,
              notes: isApproved ? vehicle.approval_notes : undefined,
              rejection_reason: !isApproved ? vehicle.rejection_reason : undefined,
              estimated_cost: estimatedCost,
              time_to_approval_hours: timeToApprovalHours,
              work_items_count: workItems.length,
              work_items: workItems.map(wi => ({
                id: wi.id,
                title: wi.title,
                work_type: wi.work_type || 'other',
                estimated_cost: wi.estimated_cost || 0,
                approval_status: wi.approval_status || 'pending',
                approval_required: wi.approval_required || false
              }))
            };
          });

        // Apply search filter if present
        if (filters.searchQuery.trim()) {
          const searchLower = filters.searchQuery.toLowerCase();
          return historyItems.filter(item =>
            item.stock_number.toLowerCase().includes(searchLower) ||
            item.vin.toLowerCase().includes(searchLower) ||
            item.vehicle_make?.toLowerCase().includes(searchLower) ||
            item.vehicle_model?.toLowerCase().includes(searchLower) ||
            item.approver_name.toLowerCase().includes(searchLower) ||
            item.rejection_reason?.toLowerCase().includes(searchLower) ||
            item.work_items.some(wi =>
              wi.title.toLowerCase().includes(searchLower) ||
              wi.work_type.toLowerCase().includes(searchLower)
            )
          );
        }

        return historyItems;
      } catch (error) {
        console.error('Error in useApprovalHistory:', error);
        return [];
      }
    },
    enabled: !!dealerId,
    staleTime: 1000 * 60 * 5, // 5 minutes - historical data doesn't change often
  });
}
