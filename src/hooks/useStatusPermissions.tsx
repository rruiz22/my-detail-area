import { AppModule, usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
import { sendStatusChangedSMS } from '@/services/smsNotificationHelper';
import { slackNotificationService } from '@/services/slackNotificationService';
import { dev, error as logError } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UseStatusPermissionsReturn {
  canUpdateStatus: (dealerId: string, currentStatus: string, newStatus: string, orderType?: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: string, dealerId: string) => Promise<boolean>;
  loading: boolean;
}

export function useStatusPermissions(): UseStatusPermissionsReturn {
  const { enhancedUser, hasModulePermission, loading } = usePermissions();
  const { toast } = useToast();
  const { t } = useTranslation();

  const canUpdateStatus = useCallback(async (
    dealerId: string,
    currentStatus: string,
    newStatus: string,
    orderType?: string
  ): Promise<boolean> => {
    try {
      // System admins can always update status
      if (enhancedUser?.is_system_admin) {
        console.log('✅ System admin - status change allowed');
        return true;
      }

      // Must have enhanced user loaded
      if (!enhancedUser) {
        console.warn('⚠️ No enhanced user loaded - denying status change');
        return false;
      }

      // Supermanagers can update orders from ALL dealerships
      if (enhancedUser.is_supermanager) {
        console.log('✅ Supermanager - multi-dealer status change allowed', {
          userDealership: enhancedUser.dealership_id,
          orderDealership: dealerId
        });
        // Continue to permission check below (don't return yet)
      }
      // Dealer users can only update orders from own dealership
      else if (parseInt(dealerId) !== enhancedUser.dealership_id) {
        console.warn('⚠️ Dealer user cannot update orders from different dealership', {
          userDealership: enhancedUser.dealership_id,
          orderDealership: dealerId
        });
        return false;
      }

      // NOTE: Removed validation that prevented changing status on completed/cancelled orders
      // Users with proper permissions should be able to reopen completed/cancelled orders

      // Determine which module to check based on order type
      let module: AppModule = 'sales_orders'; // default

      if (orderType) {
        const moduleMap: Record<string, AppModule> = {
          'sales': 'sales_orders',
          'service': 'service_orders',
          'recon': 'recon_orders',
          'carwash': 'car_wash'
        };
        module = moduleMap[orderType] || 'sales_orders';
      }

      // Check if user has change_status permission for this module
      const hasChangeStatus = hasModulePermission(module, 'change_status');

      if (!hasChangeStatus) {
        console.warn(`⚠️ User does not have change_status permission for ${module}`);
        return false;
      }

      console.log(`✅ User has permission to change status for ${module}`);
      return true;

    } catch (error) {
      console.error('Error in canUpdateStatus:', error);
      return false;
    }
  }, [enhancedUser, hasModulePermission]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    dealerId: string
  ): Promise<boolean> => {
    try {
      // Get current order before updating (to get order_number, old_status, type, and vehicle info)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('order_number, stock_number, tag, status, customer_name, order_type, vehicle_year, vehicle_make, vehicle_model, short_link, assigned_group_id, assigned_contact_id, created_by, due_date')
        .eq('id', orderId)
        .single();

      const oldStatus = currentOrder?.status;

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return false;
      }

      // Send notifications after successful update
      if (currentOrder?.order_number && enhancedUser) {
        // Fetch user's full name from profiles table
        let userName = enhancedUser.email || 'Someone';
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', enhancedUser.id)
            .single();

          if (profileData?.first_name) {
            userName = `${profileData.first_name} ${profileData.last_name || ''}`.trim();
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch user profile:', error);
        }

        // Determine module based on order type
        const moduleMap: Record<string, AppModule> = {
          'sales': 'sales_orders',
          'service': 'service_orders',
          'recon': 'recon_orders',
          'carwash': 'car_wash'
        };
        const module = moduleMap[currentOrder.order_type || 'sales'] || 'sales_orders';

        // Map order type to URL path
        const urlPathMap: Record<string, string> = {
          'sales': 'sales',
          'service': 'service',
          'recon': 'recon',
          'carwash': 'carwash'
        };
        const urlPath = urlPathMap[currentOrder.order_type || 'sales'] || 'sales';

        // Build vehicle info string
        const vehicleInfo = currentOrder.vehicle_year && currentOrder.vehicle_make && currentOrder.vehicle_model
          ? `${currentOrder.vehicle_year} ${currentOrder.vehicle_make} ${currentOrder.vehicle_model}`
          : undefined;

        // Use mda.to short link if available, otherwise fallback to correct module URL
        const shortLink = currentOrder.short_link || `https://app.mydetailarea.com/${urlPath}/${orderId}`;

        // 📱 SMS NOTIFICATION: Send SMS to users based on their notification rules
        // This uses the new 3-level validation architecture (Follower → Custom Role → User Preferences)
        // BUSINESS RULE: Only send SMS when status changes to "completed" (for sales_orders and service_orders)
        const shouldSendSMS = (module === 'sales_orders' || module === 'service_orders')
          ? newStatus === 'completed'
          : true; // Other modules: send for all status changes

        if (shouldSendSMS) {
          console.log(`📱 [SMS] Status changed to "${newStatus}" - sending SMS notification`);

          // Await SMS result to show toast confirmation
          const smsResult = await sendStatusChangedSMS({
            orderId: orderId,
            dealerId: parseInt(dealerId),
            module: module as any,
            triggeredBy: enhancedUser.id,
            eventData: {
              orderNumber: currentOrder.order_number,
              newStatus: newStatus,
              oldStatus: oldStatus,
              vehicleInfo: vehicleInfo,
              shortLink: shortLink,
              stockNumber: currentOrder.stock_number,
              tag: currentOrder.tag
            }
          });

          // Show toast confirmation if SMS sent successfully
          if (smsResult.success && smsResult.sent > 0) {
            toast({
              description: t('notifications.sms_sent_to_followers', {
                count: smsResult.sent,
                defaultValue: `SMS sent to ${smsResult.sent} follower${smsResult.sent > 1 ? 's' : ''}`
              })
            });
          }
        } else {
          console.log(`ℹ️ [SMS] Status changed to "${newStatus}" - SMS not sent (only sent for "completed" status in ${module})`);
        }

        // 🔔 PUSH NOTIFICATION: Send push notification to followers
        try {
          console.log(`🔔 [PUSH] Sending push notification for status change to "${newStatus}"`);

          const { pushNotificationHelper } = await import('@/services/pushNotificationHelper');

          // Send push notification asynchronously (don't block the status update)
          // NEW: Now includes module and eventType for 4-level validation
          pushNotificationHelper.notifyOrderStatusChange(
            orderId,
            currentOrder.order_number || orderId,
            newStatus,
            userName,
            enhancedUser.id,  // ✅ Exclude user who made the change
            module,           // ✅ Pass module for validation
            'order_status_changed'  // ✅ Pass event type for validation
          ).catch(error => {
            console.error('[PUSH] Failed to send push notification (non-critical):', error);
          });

          console.log('✅ [PUSH] Push notification triggered successfully');
        } catch (error) {
          console.error('[PUSH] Error triggering push notification (non-critical):', error);
        }

        // 📤 SLACK NOTIFICATION: Status Changed
        console.log('🔍 [DEBUG] Checking Slack for status change:', {
          dealerId,
          module,
          oldStatus,
          newStatus
        });

        void slackNotificationService.isEnabled(
          parseInt(dealerId),
          module,
          'order_status_changed'
        ).then(async (slackEnabled) => {
          console.log('🔍 [DEBUG] Slack enabled result:', slackEnabled);

          if (slackEnabled) {
            console.log('📤 Slack enabled for status change, sending notification...');

            // 🔍 Fetch assigned user/group name (or creator if not assigned)
            let assignedToName: string | undefined = undefined;
            if (currentOrder.assigned_group_id) {
              try {
                const { data: groupData, error: groupError } = await supabase
                  .from('dealer_groups')
                  .select('name')
                  .eq('id', currentOrder.assigned_group_id)
                  .single();

                if (groupError) {
                  console.warn('⚠️ Group not found:', currentOrder.assigned_group_id, groupError);
                } else if (groupData?.name) {
                  assignedToName = groupData.name;
                }
              } catch (error) {
                console.warn('⚠️ Failed to fetch group name:', error);
              }
            } else if (currentOrder.assigned_contact_id) {
              try {
                const { data: contactData, error: contactError } = await supabase
                  .from('dealership_contacts')
                  .select('first_name, last_name')
                  .eq('id', currentOrder.assigned_contact_id)
                  .single();

                if (contactError) {
                  console.warn('⚠️ Contact not found:', currentOrder.assigned_contact_id, contactError);
                } else if (contactData) {
                  assignedToName = `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim();
                }
              } catch (error) {
                console.warn('⚠️ Failed to fetch contact name:', error);
              }
            }

            // If no assignment, use creator name
            if (!assignedToName && currentOrder.created_by) {
              try {
                const { data: creatorData } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, email')
                  .eq('id', currentOrder.created_by)
                  .single();

                if (creatorData?.first_name) {
                  assignedToName = `${creatorData.first_name} ${creatorData.last_name || ''}`.trim();
                } else if (creatorData?.email) {
                  assignedToName = creatorData.email;
                }
              } catch (error) {
                console.warn('⚠️ Failed to fetch creator name:', error);
              }
            }

            await slackNotificationService.notifyStatusChange({
              orderId: orderId,
              dealerId: parseInt(dealerId),
              module: module as any,
              eventData: {
                orderNumber: currentOrder.order_number,
                stockNumber: currentOrder.stock_number,
                tag: currentOrder.tag,
                vinNumber: undefined, // Not available in this context
                vehicleInfo: vehicleInfo,
                status: newStatus,
                oldStatus: oldStatus,
                shortLink: shortLink,
                assignedTo: assignedToName,
                changedBy: userName, // Add who made the change
                dueDateTime: currentOrder.due_date
              }
            });
          } else {
            console.log('🔕 Slack NOT enabled for status change');
          }
        }).catch(err => {
          logError('❌ [Slack] Error sending status change notification:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  }, [enhancedUser, toast, t]);

  return {
    canUpdateStatus,
    updateOrderStatus,
    loading
  };
}
