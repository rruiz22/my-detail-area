import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  orderNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }

    const { to, message, orderNumber }: SMSRequest = await req.json();

    // Format the phone number (ensure it starts with +1 for US numbers)
    const formattedPhone = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

    // Send SMS using Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: '+1YOUR_TWILIO_PHONE', // Replace with your Twilio phone number
      Body: `${message}\n\nOrder: ${orderNumber}`,
    });

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Twilio API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    console.log(`SMS sent successfully to ${formattedPhone} for order ${orderNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: result.sid,
        to: formattedPhone,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);