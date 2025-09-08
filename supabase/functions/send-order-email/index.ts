import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  orderNumber: string;
  customerName: string;
  orderDetails: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const { to, subject, orderNumber, customerName, orderDetails }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Orders <orders@yourdomain.com>", // Replace with your domain
      to: [to],
      subject: subject || `Order Update - ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Order ${orderNumber}</h1>
          <p>Dear ${customerName},</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details:</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Status:</strong> ${orderDetails.status}</p>
            <p><strong>Vehicle:</strong> ${orderDetails.vehicle_year} ${orderDetails.vehicle_make} ${orderDetails.vehicle_model}</p>
            ${orderDetails.vehicle_vin ? `<p><strong>VIN:</strong> ${orderDetails.vehicle_vin}</p>` : ''}
            ${orderDetails.stock_number ? `<p><strong>Stock Number:</strong> ${orderDetails.stock_number}</p>` : ''}
          </div>

          ${orderDetails.services && orderDetails.services.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3>Services:</h3>
              <ul>
                ${orderDetails.services.map((service: any) => `<li>${service.name} - $${service.price}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${orderDetails.notes ? `
            <div style="margin: 20px 0;">
              <h3>Notes:</h3>
              <p>${orderDetails.notes}</p>
            </div>
          ` : ''}

          <p>Thank you for your business!</p>
          <p>Best regards,<br>Your Service Team</p>
        </div>
      `,
    });

    console.log(`Email sent successfully to ${to} for order ${orderNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
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
    console.error("Error in send-order-email function:", error);
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