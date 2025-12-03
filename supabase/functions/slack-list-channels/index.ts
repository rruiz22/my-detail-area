/**
 * Slack List Channels Edge Function
 *
 * Fetches available channels from a Slack workspace using the Slack API.
 * Only accessible by system_admin and dealer_admin roles.
 *
 * @endpoint POST /slack-list-channels
 * @auth Required (JWT)
 * @body { dealer_id: number, integration_id: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_member: boolean;
  num_members?: number;
}

interface SlackConversationsListResponse {
  ok: boolean;
  channels: SlackChannel[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { dealer_id, integration_id } = await req.json();

    if (!dealer_id || !integration_id) {
      return new Response(
        JSON.stringify({ error: 'Missing dealer_id or integration_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user can configure Slack (system_admin or dealer_admin)
    const { data: hasPermission, error: permError } = await supabase.rpc(
      'can_configure_slack_integration',
      { user_id: user.id, dealer_id: dealer_id }
    );

    if (permError || !hasPermission) {
      console.error('Permission check failed:', permError);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only system_admin and dealer_admin can list channels.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch integration from database
    // Note: In shared OAuth model, integration is not tied to specific dealer_id
    // Permission check above validates user access
    const { data: integration, error: intError } = await supabase
      .from('dealer_integrations')
      .select('oauth_access_token, integration_type, status')
      .eq('id', integration_id)
      .eq('integration_type', 'slack')
      .eq('status', 'active')
      .single();

    if (intError || !integration) {
      console.error('Integration not found:', intError);
      return new Response(
        JSON.stringify({ error: 'Slack integration not found or inactive' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!integration.oauth_access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing Slack access token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch channels from Slack API
    const allChannels: SlackChannel[] = [];
    let cursor: string | undefined;
    let requestCount = 0;
    const maxRequests = 10; // Pagination limit to prevent abuse

    do {
      // Build API URL
      const url = new URL('https://slack.com/api/conversations.list');
      url.searchParams.set('types', 'public_channel,private_channel');
      url.searchParams.set('exclude_archived', 'true');
      url.searchParams.set('limit', '200');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      // Call Slack API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.oauth_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: SlackConversationsListResponse = await response.json();

      if (!data.ok) {
        console.error('Slack API error:', data.error);
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch channels from Slack',
            slack_error: data.error
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Add channels to result
      allChannels.push(...data.channels);

      // Check for next page
      cursor = data.response_metadata?.next_cursor;
      requestCount++;

    } while (cursor && requestCount < maxRequests);

    // Filter and format channels
    const channels = allChannels
      .filter(channel => !channel.is_archived) // Exclude archived
      .map(channel => ({
        id: channel.id,
        name: `#${channel.name}`, // Add # prefix
        is_private: channel.is_private,
        is_member: channel.is_member,
        num_members: channel.num_members
      }))
      .sort((a, b) => {
        // Sort: public channels first, then by member count (desc), then by name
        if (a.is_private !== b.is_private) {
          return a.is_private ? 1 : -1;
        }
        if (a.num_members && b.num_members && a.num_members !== b.num_members) {
          return b.num_members - a.num_members;
        }
        return a.name.localeCompare(b.name);
      });

    return new Response(
      JSON.stringify({
        success: true,
        channels,
        total: channels.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
