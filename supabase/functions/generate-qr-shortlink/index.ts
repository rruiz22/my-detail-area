import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use service role client for server operations
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QRRequest {
  orderId: string;
  orderNumber: string;
  dealerId: number;
  regenerate?: boolean;
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

    const { orderId, orderNumber, dealerId, regenerate = false }: QRRequest = await req.json();

    console.log(`Processing QR generation for order ${orderNumber} (ID: ${orderId})`);

    // Check if link already exists and regenerate is false
    if (!regenerate) {
      const { data: existingLink } = await supabase
        .from("sales_order_links")
        .select("*")
        .eq("order_id", orderId)
        .eq("is_active", true)
        .single();

      if (existingLink) {
        console.log(`Using existing link for order ${orderNumber}`);
        return new Response(
          JSON.stringify({
            success: true,
            linkId: existingLink.id,
            shortLink: existingLink.short_url,
            qrCodeUrl: existingLink.qr_code_url,
            deepLink: existingLink.deep_link,
            slug: existingLink.slug,
            analytics: {
              totalClicks: existingLink.total_clicks,
              uniqueClicks: existingLink.unique_clicks,
              lastClickedAt: existingLink.last_clicked_at,
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Generate unique 5-digit slug
    const { data: slugData, error: slugError } = await supabase
      .rpc('generate_unique_slug');

    if (slugError || !slugData) {
      console.error("Error generating slug:", slugError);
      throw new Error("Failed to generate unique slug");
    }

    const slug = slugData;
    console.log(`Generated slug: ${slug}`);

    // Create the deep link to our redirect endpoint
    const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://my-detail-area.lovable.app";
    const redirectUrl = `${appUrl}/s/${slug}`;
    const deepLink = `${appUrl}/sales-orders?order=${orderId}`;

    // Generate short link using mda.to API (fallback to redirectUrl if unavailable)
    let shortLink = redirectUrl;
    try {
      const shortLinkResponse = await fetch("https://mda.to/api/v1/shorten", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mdaApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: redirectUrl,
          title: `Order ${orderNumber}`,
          description: `View order details for ${orderNumber}`,
          alias: slug.toLowerCase(), // Use our slug as alias
        }),
      });

      if (shortLinkResponse.ok) {
        const contentType = shortLinkResponse.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const shortLinkData = await shortLinkResponse.json();
          shortLink = shortLinkData.shortUrl || redirectUrl;
        } else {
          const errorText = await shortLinkResponse.text();
          console.warn("MDA API returned non-JSON response; using fallback:", errorText);
        }
      } else {
        const errorText = await shortLinkResponse.text();
        console.warn("MDA API Error (shorten); using fallback:", errorText);
      }
    } catch (err) {
      console.warn("Shorten API call failed; using fallback redirectUrl:", err);
    }

    // Generate QR code (client can also render QR locally; this is optional)
    let qrCodeUrl: string | null = null;
    try {
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
          logo: null, // Could add logo later
        }),
      });

      if (qrResponse.ok) {
        const qrContentType = qrResponse.headers.get("content-type") || "";
        if (qrContentType.includes("application/json")) {
          const qrData = await qrResponse.json();
          qrCodeUrl = qrData.qrUrl || null;
        } else {
          const errorText = await qrResponse.text();
          console.warn("QR API returned non-JSON response; skipping hosted QR:", errorText);
        }
      } else {
        const errorText = await qrResponse.text();
        console.warn("QR API Error; skipping hosted QR:", errorText);
      }
    } catch (err) {
      console.warn("QR API call failed; skipping hosted QR:", err);
    }

    // Disable existing links if regenerating
    if (regenerate) {
      await supabase
        .from("sales_order_links")
        .update({ is_active: false })
        .eq("order_id", orderId);
    }

    // Create new sales order link record
    const { data: linkData, error: linkError } = await supabase
      .from("sales_order_links")
      .insert({
        order_id: orderId,
        dealer_id: dealerId,
        slug: slug,
        short_url: shortLink,
        qr_code_url: qrCodeUrl,
        deep_link: deepLink,
        title: `Order ${orderNumber}`,
        description: `View order details for ${orderNumber}`,
        created_by: null, // Could get from auth context
      })
      .select()
      .single();

    if (linkError) {
      console.error("Error creating sales order link:", linkError);
      throw new Error("Failed to create sales order link record");
    }

    // Also update the legacy order fields for backward compatibility
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        short_link: shortLink,
        qr_code_url: qrCodeUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("Error updating order:", orderUpdateError);
      // Don't throw error here as the main functionality works
    }

    console.log(`Successfully generated QR and link for order ${orderNumber} with slug ${slug}`);

    return new Response(
      JSON.stringify({
        success: true,
        linkId: linkData.id,
        shortLink,
        qrCodeUrl,
        deepLink,
        slug,
        redirectUrl,
        analytics: {
          totalClicks: 0,
          uniqueClicks: 0,
          lastClickedAt: null,
        }
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