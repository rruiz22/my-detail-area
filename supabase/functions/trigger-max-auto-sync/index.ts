import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerSyncRequest {
  dealerId: number;
  username: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Railway credentials from secrets
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
    const railwayApiSecret = Deno.env.get('RAILWAY_API_SECRET');

    if (!railwayApiUrl || !railwayApiSecret) {
      throw new Error('Railway credentials not configured in Supabase secrets');
    }

    // Parse request
    const { dealerId, username, password } = await req.json() as TriggerSyncRequest;

    // Validate inputs
    if (!dealerId || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: dealerId, username, password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Dealer ${dealerId}] Triggering manual sync`);

    // Call Railway API
    const response = await fetch(`${railwayApiUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': railwayApiSecret
      },
      body: JSON.stringify({
        dealerId,
        username,
        password
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Dealer ${dealerId}] Railway API error:`, error);
      throw new Error(`Railway API error: ${error}`);
    }

    const result = await response.json();
    console.log(`[Dealer ${dealerId}] Sync triggered successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync started',
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error triggering sync:', error);

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
