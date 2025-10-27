# Settings Hub Edge Functions - Complete Implementation
## Production-Ready TypeScript Code

---

## Tabla de Contenidos

1. [Shared Utilities](#shared-utilities)
2. [Slack Functions](#slack-functions)
3. [Webhook Functions](#webhook-functions)
4. [Notification Functions](#notification-functions)
5. [Audit Functions](#audit-functions)

---

## Shared Utilities

### File: `supabase/functions/_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}
```

---

## Slack Functions

### File: `supabase/functions/slack-send-message/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, securityHeaders } from '../_shared/cors.ts'

interface SendMessageRequest {
  dealer_id: number
  channel: string
  text: string
  blocks?: any[]
  attachments?: any[]
  thread_ts?: string
}

interface SlackMessageResponse {
  ok: boolean
  channel?: string
  ts?: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body: SendMessageRequest = await req.json()
    const { dealer_id, channel, text, blocks, attachments, thread_ts } = body

    // Validate required fields
    if (!dealer_id || !channel || !text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: dealer_id, channel, text'
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[Slack Send] dealer_id=${dealer_id}, channel=${channel}, user=${user.id}`)

    // Verify dealer access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('dealer_id, system_role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'User not found' }
        }),
        {
          status: 403,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check dealer access (super_admin can access all dealers)
    if (userData.system_role !== 'super_admin' && userData.dealer_id !== dealer_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this dealership' }
        }),
        {
          status: 403,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check rate limit (100 msgs/min per dealer)
    const rateLimitKey = `slack:send:dealer:${dealer_id}:user:${user.id}`
    const windowStart = Math.floor(Date.now() / 1000) - 60

    const { data: recentRequests } = await supabase
      .from('rate_limit_log')
      .select('id')
      .eq('rate_key', rateLimitKey)
      .gte('timestamp', windowStart)

    if (recentRequests && recentRequests.length >= 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded: 100 messages per minute',
            details: { retry_after: 60 }
          }
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      )
    }

    // Log rate limit entry
    await supabase.from('rate_limit_log').insert({
      rate_key: rateLimitKey,
      endpoint: 'slack-send-message',
      timestamp: Math.floor(Date.now() / 1000),
    })

    // Retrieve Slack integration
    const { data: integration, error: integrationError } = await supabase
      .from('dealer_integrations')
      .select('id, config, oauth_access_token, enabled, credentials_encrypted')
      .eq('dealer_id', dealer_id)
      .eq('integration_type', 'slack')
      .eq('enabled', true)
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Slack integration not configured or disabled'
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Decrypt token if encrypted
    let botToken = integration.oauth_access_token

    if (integration.credentials_encrypted) {
      const { data: decryptedToken, error: decryptError } = await supabase
        .rpc('decrypt_secret', { ciphertext: botToken })

      if (decryptError) {
        console.error('[Slack Send] Decryption failed:', decryptError)
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'ENCRYPTION_ERROR', message: 'Failed to decrypt credentials' }
          }),
          {
            status: 500,
            headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      botToken = decryptedToken
    }

    if (!botToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'CONFIGURATION_ERROR', message: 'Bot token not available' }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send message to Slack
    const slackPayload: any = {
      channel,
      text,
    }

    if (blocks) slackPayload.blocks = blocks
    if (attachments) slackPayload.attachments = attachments
    if (thread_ts) slackPayload.thread_ts = thread_ts

    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    })

    const slackData: SlackMessageResponse = await slackResponse.json()

    if (!slackData.ok) {
      console.error('[Slack Send] Error:', slackData.error)

      // Handle specific errors
      if (slackData.error === 'invalid_auth' || slackData.error === 'token_revoked') {
        // Disable integration
        await supabase
          .from('dealer_integrations')
          .update({ enabled: false, status: 'invalid_credentials' })
          .eq('id', integration.id)

        // Log security event
        await supabase.from('audit_logs').insert({
          dealer_id,
          user_id: user.id,
          event_type: 'integration.slack.credentials_invalid',
          event_category: 'security',
          severity: 'error',
          resource_type: 'integration',
          resource_id: integration.id,
          metadata: { error: slackData.error },
          request_id: requestId,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'SLACK_API_ERROR',
            message: `Slack API error: ${slackData.error}`,
            details: { slack_error: slackData.error }
          }
        }),
        {
          status: 502,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[Slack Send] Message sent successfully, ts=${slackData.ts}`)

    // Log successful send
    await supabase.from('audit_logs').insert({
      dealer_id,
      user_id: user.id,
      event_type: 'integration.slack.message_sent',
      event_category: 'integrations',
      severity: 'info',
      resource_type: 'slack_message',
      resource_id: slackData.ts,
      metadata: {
        channel,
        integration_id: integration.id,
        message_length: text.length,
        has_blocks: !!blocks,
        has_attachments: !!attachments,
      },
      request_id: requestId,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message_ts: slackData.ts,
          channel: slackData.channel,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
      }
    )
  } catch (error) {
    console.error('[Slack Send] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
      }
    )
  }
})
```

### File: `supabase/functions/slack-test-connection/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, securityHeaders } from '../_shared/cors.ts'

interface TestConnectionRequest {
  dealer_id: number
  integration_id?: string
  bot_token?: string // For testing before save
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: TestConnectionRequest = await req.json()
    const { dealer_id, integration_id, bot_token } = body

    if (!dealer_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'dealer_id is required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify dealer access
    const { data: userData } = await supabase
      .from('users')
      .select('dealer_id, system_role')
      .eq('id', user.id)
      .single()

    if (userData.system_role !== 'super_admin' && userData.dealer_id !== dealer_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let tokenToTest = bot_token

    // If integration_id provided, fetch from database
    if (integration_id && !bot_token) {
      const { data: integration } = await supabase
        .from('dealer_integrations')
        .select('oauth_access_token, credentials_encrypted')
        .eq('id', integration_id)
        .eq('dealer_id', dealer_id)
        .single()

      if (!integration) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Integration not found' }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      tokenToTest = integration.oauth_access_token

      // Decrypt if needed
      if (integration.credentials_encrypted) {
        const { data: decrypted } = await supabase
          .rpc('decrypt_secret', { ciphertext: tokenToTest })
        tokenToTest = decrypted
      }
    }

    if (!tokenToTest) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No token provided' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test 1: auth.test
    const authTestResponse = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToTest}`,
        'Content-Type': 'application/json',
      },
    })

    const authTestData = await authTestResponse.json()

    if (!authTestData.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'SLACK_AUTH_FAILED',
            message: `Slack authentication failed: ${authTestData.error}`,
            details: { slack_error: authTestData.error }
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test 2: conversations.list (get channel count)
    const channelsResponse = await fetch('https://slack.com/api/conversations.list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToTest}`,
        'Content-Type': 'application/json',
      },
    })

    const channelsData = await channelsResponse.json()
    const channelCount = channelsData.ok ? channelsData.channels?.length || 0 : 0

    // Log test
    await supabase.from('audit_logs').insert({
      dealer_id,
      user_id: user.id,
      event_type: 'integration.slack.connection_tested',
      event_category: 'integrations',
      severity: 'info',
      resource_type: 'integration',
      resource_id: integration_id,
      metadata: {
        workspace_name: authTestData.team,
        bot_user_id: authTestData.user_id,
        channel_count: channelCount,
      },
      request_id: requestId,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          workspace_name: authTestData.team,
          workspace_id: authTestData.team_id,
          bot_user_id: authTestData.user_id,
          channel_count: channelCount,
          connection_status: 'ok',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  } catch (error) {
    console.error('[Slack Test] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  }
})
```

### File: `supabase/functions/slack-list-channels/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ListChannelsRequest {
  dealer_id: number
  include_private?: boolean
  cursor?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ListChannelsRequest = await req.json()
    const { dealer_id, include_private = false, cursor } = body

    // Retrieve integration
    const { data: integration } = await supabase
      .from('dealer_integrations')
      .select('oauth_access_token, credentials_encrypted')
      .eq('dealer_id', dealer_id)
      .eq('integration_type', 'slack')
      .eq('enabled', true)
      .single()

    if (!integration) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Slack integration not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let botToken = integration.oauth_access_token

    if (integration.credentials_encrypted) {
      const { data: decrypted } = await supabase.rpc('decrypt_secret', { ciphertext: botToken })
      botToken = decrypted
    }

    // Fetch channels from Slack
    const params: any = {
      types: include_private ? 'public_channel,private_channel' : 'public_channel',
      exclude_archived: true,
      limit: 100,
    }

    if (cursor) params.cursor = cursor

    const channelsResponse = await fetch(
      `https://slack.com/api/conversations.list?${new URLSearchParams(params)}`,
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    )

    const channelsData = await channelsResponse.json()

    if (!channelsData.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SLACK_API_ERROR', message: `Slack error: ${channelsData.error}` }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const channels = channelsData.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_member: ch.is_member,
      num_members: ch.num_members,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          channels,
          next_cursor: channelsData.response_metadata?.next_cursor,
          has_more: !!channelsData.response_metadata?.next_cursor,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  } catch (error) {
    console.error('[Slack List Channels] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        meta: { timestamp: new Date().toISOString(), request_id: requestId },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Webhook Functions

### File: `supabase/functions/webhook-deliver/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookDeliverRequest {
  dealer_id: number
  event_type: string
  payload: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: WebhookDeliverRequest = await req.json()
    const { dealer_id, event_type, payload } = body

    console.log(`[Webhook Deliver] dealer=${dealer_id}, event=${event_type}`)

    // Find all webhooks subscribed to this event
    const { data: webhooks } = await supabase
      .from('dealer_integrations')
      .select('*')
      .eq('dealer_id', dealer_id)
      .eq('integration_type', 'webhook')
      .eq('enabled', true)
      .contains('config->events', [event_type])

    if (!webhooks || webhooks.length === 0) {
      console.log(`[Webhook Deliver] No webhooks found for event ${event_type}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: { delivered_count: 0, failed_count: 0, deliveries: [] },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deliveries = []

    for (const webhook of webhooks) {
      const deliveryStartTime = Date.now()

      // Create delivery record
      const { data: delivery } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhook.id,
          dealer_id,
          event_type,
          payload,
          status: 'pending',
        })
        .select()
        .single()

      try {
        // Build headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-MyDetailArea-Event': event_type,
          'X-MyDetailArea-Delivery': delivery.id,
          'X-MyDetailArea-Timestamp': new Date().toISOString(),
          ...(webhook.config.headers || {}),
        }

        // Add authentication
        if (webhook.config.auth_type === 'bearer') {
          headers['Authorization'] = `Bearer ${webhook.config.auth_config.token}`
        } else if (webhook.config.auth_type === 'api_key') {
          headers[webhook.config.auth_config.header_name] = webhook.config.auth_config.api_key
        }

        // Send webhook
        const response = await fetch(webhook.config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000), // 30s timeout
        })

        const deliveryTime = Date.now() - deliveryStartTime
        const responseBody = await response.text()

        // Update delivery record
        await supabase
          .from('webhook_deliveries')
          .update({
            delivery_attempts: 1,
            response_status: response.status,
            response_body: responseBody.substring(0, 5000), // Limit size
            delivered_at: new Date().toISOString(),
            status: response.ok ? 'delivered' : 'failed',
            failed_at: response.ok ? null : new Date().toISOString(),
          })
          .eq('id', delivery.id)

        deliveries.push({
          webhook_id: webhook.id,
          delivery_id: delivery.id,
          status: response.ok ? 'delivered' : 'failed',
          response_status: response.status,
          delivery_time_ms: deliveryTime,
        })

        console.log(`[Webhook Deliver] ${webhook.config.url} -> ${response.status} (${deliveryTime}ms)`)

      } catch (error) {
        console.error(`[Webhook Deliver] Failed to deliver to ${webhook.config.url}:`, error)

        // Update as failed
        await supabase
          .from('webhook_deliveries')
          .update({
            delivery_attempts: 1,
            status: 'failed',
            failed_at: new Date().toISOString(),
            last_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', delivery.id)

        deliveries.push({
          webhook_id: webhook.id,
          delivery_id: delivery.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const delivered = deliveries.filter(d => d.status === 'delivered').length
    const failed = deliveries.filter(d => d.status === 'failed').length

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          delivered_count: delivered,
          failed_count: failed,
          deliveries,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  } catch (error) {
    console.error('[Webhook Deliver] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### File: `supabase/functions/webhook-test/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookTestRequest {
  url: string
  headers?: Record<string, string>
  auth_type?: 'none' | 'bearer' | 'basic' | 'api_key'
  auth_config?: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const body: WebhookTestRequest = await req.json()
    const { url, headers: customHeaders, auth_type, auth_config } = body

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'url is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build test payload
    const testPayload = {
      event_type: 'test.connection',
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from MyDetailArea Settings Hub',
    }

    // Build headers
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MyDetailArea-Webhook/1.0',
      ...(customHeaders || {}),
    }

    // Add authentication
    if (auth_type === 'bearer' && auth_config?.token) {
      fetchHeaders['Authorization'] = `Bearer ${auth_config.token}`
    } else if (auth_type === 'api_key' && auth_config?.header_name && auth_config?.api_key) {
      fetchHeaders[auth_config.header_name] = auth_config.api_key
    } else if (auth_type === 'basic' && auth_config?.username && auth_config?.password) {
      const credentials = btoa(`${auth_config.username}:${auth_config.password}`)
      fetchHeaders['Authorization'] = `Basic ${credentials}`
    }

    const startTime = Date.now()

    // Send test webhook
    const response = await fetch(url, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    const responseTime = Date.now() - startTime
    const responseBody = await response.text()

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status_code: response.status,
          response_time_ms: responseTime,
          response_body: responseBody.substring(0, 1000), // Limit response size
          response_headers: responseHeaders,
          connection_test: response.ok ? 'passed' : 'failed',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  } catch (error) {
    console.error('[Webhook Test] Error:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: errorMessage,
          details: {
            connection_test: 'failed',
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }),
      {
        status: 200, // Return 200 even on failure (it's a test)
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    )
  }
})
```

---

## Deployment Script

### File: `scripts/deploy-edge-functions.sh`

```bash
#!/bin/bash

# Settings Hub Edge Functions Deployment Script
# MyDetailArea

set -e

echo "========================================="
echo "Settings Hub Edge Functions Deployment"
echo "========================================="
echo ""

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not installed"
    echo "Install: npm install -g supabase"
    exit 1
fi

# Login check
echo "Checking Supabase login..."
supabase projects list &> /dev/null || {
    echo "Not logged in. Running: supabase login"
    supabase login
}

# Deploy functions
echo ""
echo "Deploying Slack functions..."
supabase functions deploy slack-oauth-callback --no-verify-jwt
supabase functions deploy slack-send-message
supabase functions deploy slack-test-connection
supabase functions deploy slack-list-channels

echo ""
echo "Deploying Webhook functions..."
supabase functions deploy webhook-deliver
supabase functions deploy webhook-test

echo ""
echo "Deploying Notification functions..."
supabase functions deploy notification-render-template

echo ""
echo "Deploying Audit function..."
supabase functions deploy audit-log-create

echo ""
echo "========================================="
echo "Deployment completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Set secrets: supabase secrets set KEY=value"
echo "2. Test functions via Supabase Dashboard"
echo "3. Configure frontend integration"
echo ""
```

---

**Fin del documento de implementación**
