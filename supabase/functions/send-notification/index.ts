import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createNotificationLogger, type DeliveryLog } from '../_shared/notification-logger.ts'

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
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') // JSON string
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'my-detail-area'

// ============================================================================
// SUPABASE CLIENT (Service Role)
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const logger = createNotificationLogger(supabase)

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
// FIREBASE OAuth2 TOKEN GENERATION
// ============================================================================

async function getFirebaseAccessToken(): Promise<string> {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured')
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)

    // Create JWT for OAuth2
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // Encode header and payload
    const encoder = new TextEncoder()
    const headerB64 = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const signatureInput = `${headerB64}.${payloadB64}`

    // Import private key
    const privateKey = serviceAccount.private_key
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '')

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    )

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const jwt = `${signatureInput}.${signatureB64}`

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get access token: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    return tokenData.access_token
  } catch (error) {
    console.error('[send-notification] Error generating access token:', error)
    throw error
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
    errors.push('url must be a string')
  }

  if (body.data !== undefined && typeof body.data !== 'object') {
    errors.push('data must be an object')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: body as SendNotificationRequest,
  }
}

// ============================================================================
// FCM NOTIFICATION SENDING (API v1)
// ============================================================================

async function sendFCMNotificationV1(
  token: string,
  title: string,
  body: string,
  userId: string,
  dealerId: number,
  url?: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string; logId?: string }> {
  const startTime = Date.now()
  let deliveryLogId: string | undefined

  try {
    // Pre-send logging - create delivery log in "pending" status
    const notificationId = crypto.randomUUID()
    const deliveryLogResult = await logger.logDelivery({
      dealership_id: dealerId.toString(),
      notification_id: notificationId,
      user_id: userId,
      channel: 'push',
      status: 'pending',
      provider: 'fcm',
      device_token: token.substring(0, 50),
      notification_title: title,
      notification_body: body,
      metadata: {
        url,
        data,
        fcm_version: 'v1'
      }
    })

    deliveryLogId = deliveryLogResult?.id

    // Get OAuth2 access token
    const accessToken = await getFirebaseAccessToken()

    // Prepare FCM v1 payload
    const payload = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: {
          url: url || '/',
          timestamp: new Date().toISOString(),
          ...data,
        },
        webpush: {
          notification: {
            icon: '/favicon-mda.svg',
            badge: '/favicon-mda.svg',
          },
          fcm_options: {
            link: url || '/',
          },
        },
      },
    }

    console.log('[send-notification] Sending FCM v1 notification to token:', token.substring(0, 20) + '...')

    // Send to FCM v1 API
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    )

    const responseText = await response.text()
    const latency = Date.now() - startTime
    console.log('[send-notification] FCM v1 response status:', response.status)

    if (!response.ok) {
      console.error('[send-notification] FCM v1 error response:', responseText)
      await logToDatabase('error', 'FCM v1 API returned error', {
        status: response.status,
        response: responseText,
        tokenPreview: token.substring(0, 20) + '...',
      })

      // Parse error response
      let errorCode = 'UNKNOWN'
      try {
        const errorData = JSON.parse(responseText)
        errorCode = errorData.error?.details?.[0]?.errorCode || errorData.error?.status || 'UNKNOWN'

        // Mark token as invalid for specific errors
        if (
          errorCode === 'UNREGISTERED' ||
          errorCode === 'INVALID_ARGUMENT'
        ) {
          console.log('[send-notification] Marking token as invalid')
          await supabase
            .from('fcm_tokens')
            .update({ is_active: false })
            .eq('fcm_token', token)
        }
      } catch (parseError) {
        console.error('[send-notification] Error parsing FCM error response:', parseError)
      }

      // Update delivery log with failure
      if (deliveryLogId) {
        await logger.updateStatus(deliveryLogId, 'failed', {
          failed_at: new Date(),
          error_message: responseText.substring(0, 500),
          error_code: errorCode,
          latency_ms: latency,
          provider_response: { status: response.status }
        })
      }

      return { success: false, error: responseText, logId: deliveryLogId }
    }

    // Parse success response to get provider message ID
    let providerMessageId: string | undefined
    try {
      const responseData = JSON.parse(responseText)
      providerMessageId = responseData.name // FCM v1 returns message name
    } catch (parseError) {
      console.warn('[send-notification] Could not parse FCM success response')
    }

    // Update delivery log with success
    if (deliveryLogId) {
      await logger.updateStatus(deliveryLogId, 'sent', {
        sent_at: new Date(),
        latency_ms: latency,
        provider_response: { status: response.status, message_name: providerMessageId }
      })

      // Update provider_message_id separately if available
      if (providerMessageId) {
        await supabase
          .from('notification_delivery_log')
          .update({ provider_message_id: providerMessageId })
          .eq('id', deliveryLogId)
      }
    }

    console.log('[send-notification] FCM v1 notification sent successfully')
    return { success: true, logId: deliveryLogId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const latency = Date.now() - startTime
    console.error('[send-notification] FCM v1 send exception:', errorMessage)
    await logToDatabase('error', 'FCM v1 send exception', {
      error: errorMessage,
      tokenPreview: token.substring(0, 20) + '...',
    })

    // Update delivery log with failure
    if (deliveryLogId) {
      await logger.updateStatus(deliveryLogId, 'failed', {
        failed_at: new Date(),
        error_message: errorMessage,
        error_code: 'EXCEPTION',
        latency_ms: latency
      })
    }

    return { success: false, error: errorMessage, logId: deliveryLogId }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json()

    console.log('[send-notification] Received request:', {
      userId: body.userId,
      dealerId: body.dealerId,
      title: body.title,
    })

    await logToDatabase('info', 'Notification request received', {
      userId: body.userId,
      dealerId: body.dealerId,
      title: body.title,
    })

    // Validate request
    const validation = validateRequest(body)
    if (!validation.isValid) {
      console.error('[send-notification] Validation failed:', validation.errors)
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, dealerId, title, body: messageBody, url, data } = validation.data!

    // Query active FCM tokens for user and dealer
    const { data: tokens, error: queryError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)

    if (queryError) {
      console.error('[send-notification] Query error:', queryError)
      await logToDatabase('error', 'Database query failed', { error: queryError })
      return new Response(
        JSON.stringify({ error: 'Failed to query FCM tokens', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      console.log('[send-notification] No active tokens found for user')
      await logToDatabase('warn', 'No active tokens found', { userId, dealerId })
      return new Response(
        JSON.stringify({ error: 'No active FCM tokens found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-notification] Found ${tokens.length} active token(s)`)

    // Send notifications to all tokens (parallel)
    const results = await Promise.allSettled(
      tokens.map((tokenRecord: FCMToken) =>
        sendFCMNotificationV1(tokenRecord.fcm_token, title, messageBody, userId, dealerId, url, data)
      )
    )

    // Count successes and failures
    let sent = 0
    let failed = 0
    const successfulTokens: string[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++
        successfulTokens.push(tokens[index].fcm_token)
      } else {
        failed++
        const error =
          result.status === 'rejected'
            ? result.reason
            : (result.value as any).error || 'Unknown error'
        errors.push(`Token ${index + 1}: ${error}`)
      }
    })

    console.log(`[send-notification] Results: ${sent} sent, ${failed} failed`)

    await logToDatabase('info', 'Notifications sent', {
      sent,
      failed,
      totalTokens: tokens.length,
    })

    const response: SendNotificationResponse = {
      success: sent > 0,
      sent,
      failed,
      tokens: successfulTokens,
      errors: errors.length > 0 ? errors : undefined,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[send-notification] Unexpected error:', errorMessage)
    await logToDatabase('error', 'Unexpected error', { error: errorMessage })

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
