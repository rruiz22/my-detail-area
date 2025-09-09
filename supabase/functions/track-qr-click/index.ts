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

interface ClickTrackingRequest {
  slug: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
}

// Function to parse user agent for device info
function parseUserAgent(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  let browser = 'Unknown';
  let os = 'Unknown';

  // Simple browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Simple OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    isMobile,
    deviceType: isMobile ? 'mobile' : 'desktop'
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, ipAddress, userAgent, referer, sessionId }: ClickTrackingRequest = await req.json();

    console.log(`Tracking click for slug: ${slug}`);

    // Find the link by slug
    const { data: linkData, error: linkError } = await supabase
      .from("sales_order_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (linkError || !linkData) {
      console.error("Link not found:", linkError);
      return new Response(
        JSON.stringify({ error: "Link not found" }),
        { 
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Parse user agent for device info
    const deviceInfo = userAgent ? parseUserAgent(userAgent) : {
      browser: 'Unknown',
      os: 'Unknown',
      isMobile: false,
      deviceType: 'unknown'
    };

    // Check if this is a unique click (same IP + session within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: existingClick } = await supabase
      .from("sales_order_link_clicks")
      .select("id")
      .eq("link_id", linkData.id)
      .eq("ip_address", ipAddress || "unknown")
      .eq("session_id", sessionId || "unknown")
      .gte("clicked_at", twentyFourHoursAgo)
      .limit(1);

    const isUniqueClick = !existingClick || existingClick.length === 0;

    // Insert click record
    const { error: clickError } = await supabase
      .from("sales_order_link_clicks")
      .insert({
        link_id: linkData.id,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        referer: referer || null,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_type: deviceInfo.deviceType,
        is_mobile: deviceInfo.isMobile,
        is_unique_click: isUniqueClick,
        session_id: sessionId || null,
        click_data: {
          timestamp: new Date().toISOString(),
          userAgent: userAgent,
          referer: referer
        }
      });

    if (clickError) {
      console.error("Error inserting click record:", clickError);
      // Don't fail the request, just log the error
    }

    console.log(`Click tracked for slug ${slug}, unique: ${isUniqueClick}`);

    return new Response(
      JSON.stringify({
        success: true,
        deepLink: linkData.deep_link,
        tracked: !clickError,
        isUniqueClick
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
    console.error("Error in track-qr-click function:", error);
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