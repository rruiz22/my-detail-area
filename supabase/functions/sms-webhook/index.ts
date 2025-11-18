import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireValidTwilioSignature } from "../_shared/twilio-validator.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse Twilio webhook data
    const formData = await req.formData();
    const twilioData = Object.fromEntries(formData.entries());

    const {
      MessageSid: messageSid,
      MessageStatus: messageStatus,
      From: fromNumber,
      To: toNumber,
      Body: messageBody,
      NumMedia: numMedia
    } = twilioData;

    console.log('Received SMS webhook:', {
      messageSid,
      messageStatus,
      fromNumber,
      toNumber,
      messageBody: messageBody?.substring(0, 100)
    });

    // DELIVERY STATUS CALLBACK - Update sms_send_history
    // Security: Delivery status callbacks are less critical - log warning but allow
    if (messageStatus) {
      console.log(`📬 Delivery status callback: ${messageStatus} for ${messageSid}`);

      // Optional validation for delivery status (warning-only, doesn't block)
      if (twilioAuthToken) {
        const errorResponse = await requireValidTwilioSignature(
          req,
          twilioData,
          twilioAuthToken,
          corsHeaders
        );

        if (errorResponse) {
          console.warn('⚠️ Delivery status callback has invalid signature - allowing anyway (less critical)');
          // Continue processing despite invalid signature for delivery status
        }
      }

      return await handleDeliveryStatus(messageSid as string, messageStatus as string);
    }

    // INBOUND MESSAGE - Process as customer message
    // Security: Strict validation required for inbound messages
    console.log('📨 Inbound message from customer');

    if (twilioAuthToken) {
      const errorResponse = await requireValidTwilioSignature(
        req,
        twilioData,
        twilioAuthToken,
        corsHeaders
      );

      if (errorResponse) {
        console.error('🚨 Inbound message rejected - invalid signature');
        return errorResponse; // Unauthorized - invalid signature
      }
    } else {
      console.warn('⚠️ TWILIO_AUTH_TOKEN not configured - skipping signature validation');
    }

    // Clean phone numbers
    const cleanFromNumber = cleanPhoneNumber(fromNumber as string);
    const cleanToNumber = cleanPhoneNumber(toNumber as string);

    // Find or create conversation
    const conversation = await findOrCreateConversation(
      cleanFromNumber,
      cleanToNumber,
      messageBody as string
    );

    // Handle media attachments
    const mediaUrls = [];
    if (numMedia && parseInt(numMedia as string) > 0) {
      for (let i = 0; i < parseInt(numMedia as string); i++) {
        const mediaUrl = twilioData[`MediaUrl${i}`];
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
        }
      }
    }

    // Create SMS message record
    const { data: messageRecord, error: messageError } = await supabase
      .from('sms_messages')
      .insert({
        conversation_id: conversation.id,
        twilio_sid: messageSid,
        direction: 'inbound',
        message_body: messageBody || '',
        media_urls: mediaUrls,
        from_number: cleanFromNumber,
        to_number: cleanToNumber,
        status: 'received'
      })
      .select()
      .single();

    if (messageError) {
      throw new Error(`Failed to create message record: ${messageError.message}`);
    }

    // Update conversation
    await supabase
      .from('sms_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: conversation.message_count + 1
      })
      .eq('id', conversation.id);

    // Process auto-responses
    await processAutoResponse(conversation, messageBody as string, cleanFromNumber);

    // Check for order mentions and create notifications
    await processOrderMentions(conversation, messageBody as string);

    return new Response('OK', {
      status: 200,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('SMS webhook error:', error);
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

async function findOrCreateConversation(
  fromNumber: string, 
  toNumber: string, 
  messageBody: string
) {
  // Extract potential order references from message
  const orderPattern = /(SA|SV|RC|CW)-?\d{4}-?\d{3,4}/gi;
  const orderMatches = messageBody.match(orderPattern);
  
  let entityType: string | null = null;
  let entityId: string | null = null;

  if (orderMatches && orderMatches.length > 0) {
    const orderNumber = orderMatches[0];
    
    // Find the order in database
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_type, dealer_id')
      .eq('order_number', orderNumber)
      .single();

    if (order) {
      entityType = 'order';
      entityId = order.id;
    }
  }

  // Try to find existing conversation
  let conversationQuery = supabase
    .from('sms_conversations')
    .select('*')
    .eq('phone_number', fromNumber);

  if (entityType && entityId) {
    conversationQuery = conversationQuery
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
  }

  const { data: existingConversation } = await conversationQuery.single();

  if (existingConversation) {
    return existingConversation;
  }

  // Create new conversation
  const conversationData: any = {
    phone_number: fromNumber,
    status: 'active',
    message_count: 0,
    last_message_at: new Date().toISOString()
  };

  if (entityType && entityId) {
    conversationData.entity_type = entityType;
    conversationData.entity_id = entityId;
    
    // Get dealer_id from the order
    const { data: order } = await supabase
      .from('orders')
      .select('dealer_id, customer_name')
      .eq('id', entityId)
      .single();

    if (order) {
      conversationData.dealer_id = order.dealer_id;
      conversationData.customer_name = order.customer_name;
    }
  }

  const { data: newConversation, error } = await supabase
    .from('sms_conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return newConversation;
}

async function processAutoResponse(conversation: any, messageBody: string, fromNumber: string) {
  // Check if it's business hours
  const now = new Date();
  const hour = now.getHours();
  const isBusinessHours = hour >= 8 && hour < 18;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  if (!isBusinessHours || isWeekend) {
    // Send auto-response for after hours
    const autoResponse = `Thank you for your message! We're currently closed but will respond first thing during business hours (Monday-Friday 8AM-6PM, Saturday 8AM-5PM). For urgent matters, please call us directly.`;
    
    await supabase.functions.invoke('enhanced-sms', {
      body: {
        to: fromNumber,
        message: autoResponse,
        conversationId: conversation.id,
        isAutoResponse: true
      }
    });
  } else if (messageBody.toLowerCase().includes('status') && conversation.entity_id) {
    // Auto-respond with order status
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, status, customer_name')
      .eq('id', conversation.entity_id)
      .single();

    if (order) {
      const statusResponse = `Hi ${order.customer_name}! Your order ${order.order_number} is currently ${order.status}. We'll keep you updated on any changes!`;
      
      await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: fromNumber,
          message: statusResponse,
          conversationId: conversation.id,
          entityType: 'order',
          entityId: conversation.entity_id,
          isAutoResponse: true
        }
      });
    }
  }
}

async function processOrderMentions(conversation: any, messageBody: string) {
  if (!conversation.entity_id || conversation.entity_type !== 'order') {
    return;
  }

  // Trigger notification engine for SMS received
  await supabase.functions.invoke('notification-engine', {
    body: {
      entityType: 'order',
      entityId: conversation.entity_id,
      dealerId: conversation.dealer_id,
      triggerEvent: 'sms_received',
      data: {
        message: messageBody,
        phone: conversation.phone_number,
        customer_name: conversation.customer_name
      }
    }
  });
}

function cleanPhoneNumber(phoneNumber: string): string {
  // Remove +1 and any non-digits, then format consistently
  return phoneNumber.replace(/^\+?1?/, '').replace(/\D/g, '');
}

/**
 * Handles Twilio delivery status callbacks
 * Called when Twilio updates us on SMS delivery status (sent, delivered, failed, undelivered)
 * Updates sms_send_history table for tracking and retry logic
 */
async function handleDeliveryStatus(messageSid: string, messageStatus: string): Promise<Response> {
  console.log(`🔄 Processing delivery status update: ${messageSid} -> ${messageStatus}`);

  try {
    // Update sms_send_history with delivery status
    const { data, error } = await supabase
      .from('sms_send_history')
      .update({
        status: messageStatus, // 'sent' | 'delivered' | 'failed' | 'undelivered'
        webhook_received_at: new Date().toISOString(),
        delivery_status_updated_at: new Date().toISOString()
      })
      .eq('twilio_sid', messageSid)
      .select();

    if (error) {
      console.error(`❌ Failed to update sms_send_history:`, error);
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ No sms_send_history record found for twilio_sid: ${messageSid}`);
      // Still return 200 to prevent Twilio from retrying
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No matching record found',
          messageSid
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log(`✅ Updated ${data.length} record(s) with status: ${messageStatus}`);

    // If failed and retry_count < 3, could trigger retry logic here
    if ((messageStatus === 'failed' || messageStatus === 'undelivered') && data[0].retry_count < 3) {
      console.log(`🔁 SMS delivery failed, may trigger retry (current retry_count: ${data[0].retry_count})`);
      // Retry logic will be handled by retry-failed-notifications Edge Function
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid,
        status: messageStatus,
        updatedRecords: data.length
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
    console.error('Delivery status update error:', error);

    // Return 200 even on error to prevent Twilio from retrying indefinitely
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        messageSid
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}

serve(handler);