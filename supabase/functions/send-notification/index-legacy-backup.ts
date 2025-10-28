import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SendNotificationRequest {
  userId: string
  dealerId: number
  title: string
  body: string
  url?: string
  data?: Record<string, any>
}

interface SendNotificationResponse {
  success: boolean
  sent: number
  failed: number
  tokens: string[]
  errors?: string[]
}

interface FCMToken {
  id: string
  user_id: string
  dealer_id: number
  fcm_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send'

// ============================================================================
// SUPABASE CLIENT (Service Role)
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

async function logToDatabase(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any,
  errorDetails?: any
) {
  try {
    await supabase.from('edge_function_logs').insert({
      function_name: 'send-notification',
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      error_details: errorDetails ? JSON.parse(JSON.stringify(errorDetails)) : null,
    })
  } catch (err) {
    console.error('[send-notification] Failed to write log to database:', err)
  }
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateRequest(body: any): {
  isValid: boolean
  errors: string[]
  data?: SendNotificationRequest
} {
  const errors: string[] = []

  // Required fields validation
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string')
  }

  if (!body.dealerId || typeof body.dealerId !== 'number') {
    errors.push('dealerId is required and must be a number')
  }

  if (!body.title || typeof body.title !== 'string') {
    errors.push('title is required and must be a string')
  }

  if (!body.body || typeof body.body !== 'string') {
    errors.push('body is required and must be a string')
  }

  // Optional fields validation
  if (body.url !== undefined && typeof body.url !== 'string') {
    errors.push('url must be a string if provided')
  }

  if (body.data !== undefined && typeof body.data !== 'object') {
    errors.push('data must be an object if provided')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      userId: body.userId,
      dealerId: body.dealerId,
      title: body.title,
      body: body.body,
      url: body.url,
      data: body.data,
    },
  }
}

// ============================================================================
// FCM TOKEN RETRIEVAL
// ============================================================================

async function getActiveTokens(
  userId: string,
  dealerId: number
): Promise<{ tokens: FCMToken[]; error?: string }> {
  try {
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)

    if (error) {
      console.error('[send-notification] Database error:', error)
      await logToDatabase('error', 'Failed to fetch FCM tokens from database', { userId, dealerId }, error)
      return { tokens: [], error: `Database error: ${error.message}` }
    }

    if (!tokens || tokens.length === 0) {
      console.log('[send-notification] No active tokens found for user')
      await logToDatabase('info', 'No active FCM tokens found', { userId, dealerId })
      return { tokens: [], error: 'No active FCM tokens found for user' }
    }

    console.log(`[send-notification] Found ${tokens.length} active token(s)`)
    await logToDatabase('info', `Retrieved ${tokens.length} active token(s)`, { userId, dealerId, tokenCount: tokens.length })

    return { tokens: tokens as FCMToken[] }
  } catch (err: any) {
    console.error('[send-notification] Unexpected error fetching tokens:', err)
    await logToDatabase('error', 'Unexpected error during token retrieval', { userId, dealerId }, {
      message: err.message,
      stack: err.stack,
    })
    return { tokens: [], error: `Unexpected error: ${err.message}` }
  }
}

// ============================================================================
// FCM NOTIFICATION SENDER (Legacy API)
// ============================================================================

async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  url?: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  if (!FCM_SERVER_KEY) {
    const error = 'FCM_SERVER_KEY environment variable is not configured'
    console.error('[send-notification]', error)
    await logToDatabase('error', error, {})
    return { success: false, error }
  }

  try {
    // Prepare FCM payload (Legacy API format)
    const payload = {
      to: token,
      notification: {
        title,
        body,
        icon: '/favicon-mda.svg',
        badge: '/favicon-mda.svg',
        click_action: url || '/',
      },
      data: {
        ...data,
        url: url || '/',
        timestamp: new Date().toISOString(),
      },
    }

    console.log('[send-notification] Sending to FCM:', {
      tokenPreview: token.substring(0, 20) + '...',
      title,
    })

    await logToDatabase('debug', 'Sending FCM notification', {
      tokenPreview: token.substring(0, 20) + '...',
      title,
      hasUrl: !!url,
      hasData: !!data,
    })

    // Send to FCM Legacy API
    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('[send-notification] FCM response status:', response.status)

    if (!response.ok) {
      console.error('[send-notification] FCM error response:', responseText)
      await logToDatabase('error', 'FCM API returned error', {
        status: response.status,
        response: responseText,
        tokenPreview: token.substring(0, 20) + '...',
      })

      // Parse error response
      try {
        const errorData = JSON.parse(responseText)

        // Mark token as invalid for specific errors
        if (
          errorData.results?.[0]?.error === 'NotRegistered' ||
          errorData.results?.[0]?.error === 'InvalidRegistration'
        ) {
          console.log('[send-notification] Marking token as invalid')
          await supabase
            .from('fcm_tokens')
            .update({ is_active: false })
            .eq('fcm_token', token)
        }
      } catch (parseError) {
        console.error('[send-notification] Failed to parse FCM error response:', parseError)
      }

      return { success: false, error: `FCM API error: ${response.status}` }
    }

    const result = JSON.parse(responseText)
    console.log('[send-notification] FCM success:', result)

    await logToDatabase('info', 'FCM notification sent successfully', {
      success: result.success,
      messageId: result.results?.[0]?.message_id,
    })

    return { success: true }
  } catch (err: any) {
    console.error('[send-notification] Send error:', err)
    await logToDatabase('error', 'FCM send exception', {}, {
      message: err.message,
      stack: err.stack,
    })
    return { success: false, error: err.message }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Only POST requests are accepted.',
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const requestId = crypto.randomUUID()
  console.log(`[send-notification] Request ID: ${requestId}`)

  try {
    // Parse request body
    let requestBody: any
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('[send-notification] Invalid JSON:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[send-notification] Request received:', {
      userId: requestBody.userId,
      dealerId: requestBody.dealerId,
      title: requestBody.title,
      hasUrl: !!requestBody.url,
      hasData: !!requestBody.data,
    })

    // Validate request
    const validation = validateRequest(requestBody)
    if (!validation.isValid) {
      console.error('[send-notification] Validation failed:', validation.errors)
      await logToDatabase('warn', 'Request validation failed', { errors: validation.errors })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request payload',
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { userId, dealerId, title, body, url, data } = validation.data!

    // Get active FCM tokens
    const { tokens, error: tokensError } = await getActiveTokens(userId, dealerId)

    if (tokensError) {
      // Return 404 if no tokens found, 500 for other errors
      const statusCode = tokensError.includes('No active FCM tokens') ? 404 : 500

      return new Response(
        JSON.stringify({
          success: false,
          error: tokensError,
          sent: 0,
          failed: 0,
          tokens: [],
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send notifications to all tokens
    console.log(`[send-notification] Sending to ${tokens.length} token(s)`)

    const results = await Promise.allSettled(
      tokens.map((tokenRecord) =>
        sendFCMNotification(tokenRecord.fcm_token, title, body, url, data)
      )
    )

    // Aggregate results
    const successfulSends: string[] = []
    const failedSends: string[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      const token = tokens[index].fcm_token

      if (result.status === 'fulfilled' && result.value.success) {
        successfulSends.push(token)
      } else {
        failedSends.push(token)

        if (result.status === 'fulfilled') {
          errors.push(result.value.error || 'Unknown error')
        } else {
          errors.push(result.reason?.message || 'Promise rejected')
        }
      }
    })

    const response: SendNotificationResponse = {
      success: successfulSends.length > 0,
      sent: successfulSends.length,
      failed: failedSends.length,
      tokens: successfulSends,
    }

    if (failedSends.length > 0) {
      response.errors = errors
    }

    console.log('[send-notification] Batch send completed:', {
      sent: successfulSends.length,
      failed: failedSends.length,
      total: tokens.length,
    })

    await logToDatabase('info', 'Batch notification send completed', {
      requestId,
      userId,
      dealerId,
      sent: successfulSends.length,
      failed: failedSends.length,
      total: tokens.length,
    })

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[send-notification] Unhandled error:', err)
    await logToDatabase('error', 'Unhandled exception in handler', {}, {
      message: err.message,
      stack: err.stack,
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: err.message,
        sent: 0,
        failed: 0,
        tokens: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

console.log('[send-notification] Edge Function initialized and ready')
