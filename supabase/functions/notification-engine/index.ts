import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NotificationRequest {
  entityType: string;
  entityId: string;
  dealerId: number;
  triggerEvent: string;
  triggeredBy?: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityType, entityId, dealerId, triggerEvent, triggeredBy, data }: NotificationRequest = await req.json();

    // Get followers for this entity
    const { data: followers, error: followersError } = await supabase
      .rpc('get_entity_followers', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_dealer_id: dealerId
      });

    if (followersError) {
      throw new Error(`Failed to get followers: ${followersError.message}`);
    }

    // Get applicable workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('notification_workflows')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('entity_type', entityType)
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (workflowsError) {
      throw new Error(`Failed to get workflows: ${workflowsError.message}`);
    }

    const notifications = [];

    for (const workflow of workflows || []) {
      // Check conditions
      if (!evaluateConditions(workflow.conditions, data)) {
        continue;
      }

      // Execute actions for each follower
      for (const follower of followers || []) {
        // Skip if notification level doesn't match
        if (!shouldNotifyFollower(workflow.actions, follower.notification_level)) {
          continue;
        }

        // Skip if it's the person who triggered the event
        if (triggeredBy && follower.user_id === triggeredBy) {
          continue;
        }

        for (const action of workflow.actions) {
          const notification = await createNotification({
            userId: follower.user_id,
            dealerId,
            entityType,
            entityId,
            workflowId: workflow.id,
            action,
            data,
            followerNotificationLevel: follower.notification_level
          });

          if (notification) {
            notifications.push(notification);
          }
        }
      }

      // Update workflow execution count
      await supabase
        .from('notification_workflows')
        .update({
          execution_count: workflow.execution_count + 1,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', workflow.id);
    }

    console.log(`Created ${notifications.length} notifications for ${entityType}:${entityId}`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        notifications: notifications.map(n => n.id)
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error: any) {
    console.error('Notification engine error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};

function evaluateConditions(conditions: any, data: any): boolean {
  // Simple condition evaluation
  // In a real implementation, this would be more sophisticated
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  for (const [key, expectedValue] of Object.entries(conditions)) {
    if (data[key] !== expectedValue) {
      return false;
    }
  }

  return true;
}

function shouldNotifyFollower(actions: any[], notificationLevel: string): boolean {
  const actionPriorities = actions.map(action => action.priority || 'normal');
  
  switch (notificationLevel) {
    case 'none':
      return false;
    case 'mentions':
      return actionPriorities.some(p => p === 'urgent' || p === 'mention');
    case 'important':
      return actionPriorities.some(p => p === 'high' || p === 'urgent' || p === 'mention');
    case 'all':
    default:
      return true;
  }
}

async function createNotification({
  userId,
  dealerId,
  entityType,
  entityId,
  workflowId,
  action,
  data,
  followerNotificationLevel
}: {
  userId: string;
  dealerId: number;
  entityType: string;
  entityId: string;
  workflowId: string;
  action: any;
  data: any;
  followerNotificationLevel: string;
}) {
  const notification = {
    user_id: userId,
    dealer_id: dealerId,
    entity_type: entityType,
    entity_id: entityId,
    workflow_id: workflowId,
    notification_type: action.type || 'in_app',
    channel: action.channel || 'app',
    title: interpolateTemplate(action.title, data),
    message: interpolateTemplate(action.message, data),
    data: {
      ...data,
      action_data: action.data || {},
      notification_level: followerNotificationLevel
    },
    priority: action.priority || 'normal',
    status: 'pending'
  };

  const { data: createdNotification, error } = await supabase
    .from('notification_log')
    .insert([notification])
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  // Send SMS if specified
  if (action.type === 'sms' && action.phone_field && data[action.phone_field]) {
    try {
      await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: data[action.phone_field],
          message: notification.message,
          entityType,
          entityId,
          dealerId,
          notificationId: createdNotification.id
        }
      });

      await supabase
        .from('notification_log')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          phone_number: data[action.phone_field]
        })
        .eq('id', createdNotification.id);

    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      await supabase
        .from('notification_log')
        .update({
          status: 'failed',
          failed_reason: `SMS Error: ${smsError.message}`
        })
        .eq('id', createdNotification.id);
    }
  } else {
    // Mark in-app notification as sent
    await supabase
      .from('notification_log')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', createdNotification.id);
  }

  return createdNotification;
}

function interpolateTemplate(template: string, data: any): string {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

serve(handler);