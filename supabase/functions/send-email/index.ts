import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from Supabase Secrets
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS");
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "My Detail Area";

    if (!sendgridApiKey) {
      throw new Error("Sendgrid API key not configured. Set SENDGRID_API_KEY in Supabase Secrets");
    }

    if (!fromAddress) {
      throw new Error("From address not configured. Set EMAIL_FROM_ADDRESS in Supabase Secrets");
    }

    const { to, subject, text, html, from_name }: EmailRequest = await req.json();

    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing required fields: to, subject, and (text or html)");
    }

    // Prepare email payload for Sendgrid
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: {
        email: fromAddress,
        name: from_name || fromName,
      },
      content: [],
    };

    // Add text content if provided
    if (text) {
      emailPayload.content.push({
        type: "text/plain",
        value: text,
      });
    }

    // Add HTML content if provided
    if (html) {
      emailPayload.content.push({
        type: "text/html",
        value: html,
      });
    }

    // Send email using Sendgrid API
    const sendgridUrl = "https://api.sendgrid.com/v3/mail/send";

    const response = await fetch(sendgridUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Sendgrid API error: ${response.status} - ${errorText}`);
      throw new Error(`Sendgrid API error: ${response.status}`);
    }

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({
        success: true,
        to,
        subject,
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
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
