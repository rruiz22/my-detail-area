import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "notifications@mydetailarea.com";
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "My Detail Area";

    if (!resendApiKey) {
      throw new Error("Resend API key not configured. Set RESEND_API_KEY in Supabase Secrets");
    }

    const { to, subject, text, html, from_name }: EmailRequest = await req.json();

    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing required fields: to, subject, and (text or html)");
    }

    const resend = new Resend(resendApiKey);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${from_name || fromName} <${fromAddress}>`,
      to: [to],
      subject: subject,
      text: text,
      html: html,
    });

    if (error) {
      console.error(`Resend API error:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`Email sent successfully to ${to} with ID: ${data?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        to,
        subject,
        emailId: data?.id,
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
