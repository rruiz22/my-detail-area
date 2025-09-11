import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      From: fromNumber,
      To: toNumber,
      Body: messageBody,
      NumMedia: numMedia
    } = twilioData;

    console.log('Received SMS webhook:', {
      messageSid,
      fromNumber,
      toNumber,
      messageBody: messageBody?.substring(0, 100)
    });

    // Clean phone numbers
    const cleanFromNumber = cleanPhoneNumber(fromNumber as string);
    const cleanToNumber = cleanPhoneNumber(toNumber as string);

    // Find or create conversation
    let conversation = await findOrCreateConversation(
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

serve(handler);