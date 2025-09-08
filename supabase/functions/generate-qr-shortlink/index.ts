import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QRRequest {
  orderId: string;
  orderNumber: string;
  dealerId: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mdaApiKey = Deno.env.get("MDA_TO_API_KEY");
    if (!mdaApiKey) {
      throw new Error("MDA_TO_API_KEY not configured");
    }

    const { orderId, orderNumber, dealerId }: QRRequest = await req.json();

    // Create the deep link to the order detail
    const baseUrl = "https://swfnnrpzpkdypbrzmgnr.supabase.co"; // Replace with actual app URL
    const deepLink = `${baseUrl}/orders/${orderId}`;

    // Generate short link using mda.to API
    const shortLinkResponse = await fetch("https://mda.to/api/v1/shorten", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mdaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: deepLink,
        title: `Order ${orderNumber}`,
        description: `View order details for ${orderNumber}`,
      }),
    });

    if (!shortLinkResponse.ok) {
      throw new Error(`Failed to generate short link: ${shortLinkResponse.statusText}`);
    }

    const shortLinkData = await shortLinkResponse.json();
    const shortLink = shortLinkData.shortUrl;

    // Generate QR code using mda.to API
    const qrResponse = await fetch("https://mda.to/api/v1/qr", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mdaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: shortLink,
        size: 300,
        format: "png",
        errorCorrection: "M",
      }),
    });

    if (!qrResponse.ok) {
      throw new Error(`Failed to generate QR code: ${qrResponse.statusText}`);
    }

    const qrData = await qrResponse.json();
    const qrCodeUrl = qrData.qrUrl;

    // Update the order with the generated URLs
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        short_link: shortLink,
        qr_code_url: qrCodeUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order with QR data");
    }

    console.log(`Generated QR code and short link for order ${orderNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        shortLink,
        qrCodeUrl,
        deepLink,
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
    console.error("Error in generate-qr-shortlink function:", error);
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