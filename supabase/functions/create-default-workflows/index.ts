import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CreateWorkflowsRequest {
  dealerId: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealerId }: CreateWorkflowsRequest = await req.json();

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Define default workflows
    const defaultWorkflows = [
      // Order Status Changed Workflow
      {
        name: 'Order Status Changed Notification',
        description: 'Notify all followers when an order status changes',
        entity_type: 'order',
        trigger_event: 'status_changed',
        conditions: {},
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'Order Status Updated',
            message: 'Order {{order_number}} status changed to {{new_status}}',
            priority: 'normal',
            data: {
              action_url: '/orders/{{order_id}}'
            }
          },
          {
            type: 'sms',
            channel: 'sms',
            title: 'Order Update',
            message: 'Hi {{customer_name}}! Your order {{order_number}} status has been updated to {{new_status}}.',
            priority: 'normal',
            phone_field: 'customer_phone',
            data: {}
          }
        ],
        priority: 1,
        dealer_id: dealerId,
        created_by: user.id
      },

      // Order Assignment Workflow
      {
        name: 'Order Assignment Notification',
        description: 'Notify when an order is assigned to a user or group',
        entity_type: 'order',
        trigger_event: 'assigned',
        conditions: {},
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'Order Assigned',
            message: 'Order {{order_number}} has been assigned to you',
            priority: 'high',
            data: {
              action_url: '/orders/{{order_id}}'
            }
          }
        ],
        priority: 2,
        dealer_id: dealerId,
        created_by: user.id
      },

      // Order Comment Added Workflow
      {
        name: 'Order Comment Notification',
        description: 'Notify followers when a comment is added to an order',
        entity_type: 'order',
        trigger_event: 'comment_added',
        conditions: {},
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'New Comment',
            message: '{{commenter_name}} added a comment to order {{order_number}}',
            priority: 'normal',
            data: {
              action_url: '/orders/{{order_id}}#comments'
            }
          }
        ],
        priority: 3,
        dealer_id: dealerId,
        created_by: user.id
      },

      // Order Due Soon Workflow
      {
        name: 'Order Due Soon Alert',
        description: 'Alert when an order is approaching its due date',
        entity_type: 'order',
        trigger_event: 'due_soon',
        conditions: {
          hours_before_due: 2
        },
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'Order Due Soon',
            message: 'Order {{order_number}} is due in {{hours_remaining}} hours',
            priority: 'high',
            data: {
              action_url: '/orders/{{order_id}}'
            }
          }
        ],
        priority: 4,
        dealer_id: dealerId,
        created_by: user.id
      },

      // SMS Received Workflow
      {
        name: 'Customer SMS Received',
        description: 'Notify when a customer sends an SMS about an order',
        entity_type: 'order',
        trigger_event: 'sms_received',
        conditions: {},
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'Customer Message',
            message: 'New SMS from {{customer_name}} about order {{order_number}}',
            priority: 'high',
            data: {
              action_url: '/orders/{{order_id}}/sms'
            }
          }
        ],
        priority: 5,
        dealer_id: dealerId,
        created_by: user.id
      },

      // Vehicle Workflow
      {
        name: 'Vehicle Status Changed',
        description: 'Notify when vehicle status changes in recon',
        entity_type: 'vehicle',
        trigger_event: 'status_changed',
        conditions: {},
        actions: [
          {
            type: 'in_app',
            channel: 'app',
            title: 'Vehicle Status Updated',
            message: 'Vehicle {{vin}} status changed to {{new_status}}',
            priority: 'normal',
            data: {
              action_url: '/recon/{{vehicle_id}}'
            }
          }
        ],
        priority: 1,
        dealer_id: dealerId,
        created_by: user.id
      },

      // After Hours Auto-Response Workflow
      {
        name: 'After Hours SMS Auto-Response',
        description: 'Automatically respond to SMS outside business hours',
        entity_type: 'sms',
        trigger_event: 'received_after_hours',
        conditions: {},
        actions: [
          {
            type: 'sms',
            channel: 'sms',
            title: 'Auto Response',
            message: 'Thank you for your message! We\'re currently closed but will respond during business hours (Mon-Fri 8AM-6PM, Sat 8AM-5PM). For urgent matters, please call us directly.',
            priority: 'low',
            data: {
              is_auto_response: true
            }
          }
        ],
        priority: 10,
        dealer_id: dealerId,
        created_by: user.id
      }
    ];

    // Insert workflows
    const { data: workflows, error: workflowError } = await supabase
      .from('notification_workflows')
      .insert(defaultWorkflows)
      .select();

    if (workflowError) {
      throw new Error(`Failed to create workflows: ${workflowError.message}`);
    }

    console.log(`Created ${workflows?.length || 0} default workflows for dealer ${dealerId}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflowsCreated: workflows?.length || 0,
        workflows: workflows?.map(w => ({ id: w.id, name: w.name })) || []
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
    console.error('Create workflows error:', error);
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

serve(handler);