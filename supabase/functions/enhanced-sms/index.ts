import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SMSRequest {
  to: string;
  message: string;
  entityType?: string;
  entityId?: string;
  dealerId?: number;
  conversationId?: string;
  notificationId?: string;
  isAutoResponse?: boolean;
  mediaUrls?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const {
      to,
      message,
      entityType,
      entityId,
      dealerId,
      conversationId,
      notificationId,
      isAutoResponse = false,
      mediaUrls = []
    }: SMSRequest = await req.json();

    // Clean and format phone number
    const formattedPhone = formatPhoneNumber(to);

    // Create or find conversation if not provided
    let finalConversationId = conversationId;

    if (!finalConversationId && dealerId) {
      const conversation = await findOrCreateSMSConversation({
        phoneNumber: to,
        dealerId,
        entityType,
        entityId
      });
      finalConversationId = conversation.id;
    }

    // Prepare Twilio message data
    const messageData = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhoneNumber,
      Body: message
    });

    // Add media URLs if provided
    mediaUrls.forEach((url, index) => {
      messageData.append('MediaUrl', url);
    });

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: messageData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorData}`);
    }

    const twilioResult = await twilioResponse.json();
    console.log(`SMS sent successfully: ${twilioResult.sid}`);

    // Create SMS message record if we have a conversation
    if (finalConversationId) {
      const { error: messageError } = await supabase
        .from('sms_messages')
        .insert({
          conversation_id: finalConversationId,
          twilio_sid: twilioResult.sid,
          direction: 'outbound',
          message_body: message,
          media_urls: mediaUrls,
          from_number: twilioPhoneNumber.replace('+1', ''),
          to_number: formattedPhone,
          sent_by: isAutoResponse ? null : undefined, // Will use auth.uid() if not auto-response
          status: twilioResult.status || 'sent'
        });

      if (messageError) {
        console.error('Error creating message record:', messageError);
      } else {
        // Update conversation - increment message count via raw update
        // Note: Can't use supabase.sql in edge functions, use RPC or simple update
        const { data: currentConv } = await supabase
          .from('sms_conversations')
          .select('message_count')
          .eq('id', finalConversationId)
          .single();

        await supabase
          .from('sms_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (currentConv?.message_count || 0) + 1
          })
          .eq('id', finalConversationId);
      }
    }

    // Update notification log if provided
    if (notificationId) {
      await supabase
        .from('notification_log')
        .update({
          sms_sid: twilioResult.sid,
          sms_status: twilioResult.status || 'sent',
          phone_number: formattedPhone,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    }

    // Send success response
    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioResult.sid,
        status: twilioResult.status,
        to: formattedPhone,
        conversationId: finalConversationId
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Enhanced SMS error:', error);

    // Update notification as failed if provided
    if (req.body) {
      try {
        const body = await req.json();
        if (body.notificationId) {
          await supabase
            .from('notification_log')
            .update({
              status: 'failed',
              failed_reason: `SMS Error: ${error.message}`
            })
            .eq('id', body.notificationId);
        }
      } catch (parseError) {
        console.error('Error parsing body for failure update:', parseError);
      }
    }

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
        },
      }
    );
  }
};

async function findOrCreateSMSConversation({
  phoneNumber,
  dealerId,
  entityType,
  entityId
}: {
  phoneNumber: string;
  dealerId: number;
  entityType?: string;
  entityId?: string;
}) {
  const cleanPhone = phoneNumber.replace(/^\+?1?/, '').replace(/\D/g, '');

  // Try to find existing conversation
  let query = supabase
    .from('sms_conversations')
    .select('*')
    .eq('dealer_id', dealerId)
    .eq('phone_number', cleanPhone);

  if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId);
  }

  const { data: existingConversation } = await query.single();

  if (existingConversation) {
    return existingConversation;
  }

  // Create new conversation
  const conversationData: any = {
    dealer_id: dealerId,
    phone_number: cleanPhone,
    status: 'active',
    message_count: 0
  };

  if (entityType && entityId) {
    conversationData.entity_type = entityType;
    conversationData.entity_id = entityId;

    // Get entity details for customer name
    if (entityType === 'order') {
      const { data: order } = await supabase
        .from('orders')
        .select('customer_name')
        .eq('id', entityId)
        .single();

      if (order) {
        conversationData.customer_name = order.customer_name;
      }
    }
  }

  const { data: newConversation, error } = await supabase
    .from('sms_conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create SMS conversation: ${error.message}`);
  }

  return newConversation;
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Add +1 if it's a US number (10 digits)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it already has country code, ensure it starts with +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise, assume it's already properly formatted
  return cleaned.startsWith('+') ? phone : `+${cleaned}`;
}

serve(handler);
