import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToggleSyncRequest {
  dealerId: number;
  enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request
    const { dealerId, enabled } = await req.json() as ToggleSyncRequest;

    // Validate inputs
    if (!dealerId || enabled === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: dealerId, enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Dealer ${dealerId}] Toggling auto-sync to: ${enabled}`);

    // Update configuration
    const { data, error } = await supabaseClient
      .from('dealer_max_auto_config')
      .update({
        auto_sync_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('dealer_id', dealerId)
      .select()
      .single();

    if (error) {
      console.error(`[Dealer ${dealerId}] Database error:`, error);
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found. Please save configuration first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`[Dealer ${dealerId}] Auto-sync toggled successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        config: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error toggling auto-sync:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
