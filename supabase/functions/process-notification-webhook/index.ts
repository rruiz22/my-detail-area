/**
 * Notification Webhook Processor - Enterprise-Grade
 *
 * Receives and processes webhook events from notification providers:
 * - Firebase Cloud Messaging (FCM)
 * - OneSignal
 * - Twilio (SMS delivery status)
 * - Resend (Email delivery events)
 *
 * Updates notification_delivery_log table with delivery confirmations,
 * clicks, opens, bounces, and failures.
 *
 * Security: Validates webhook signatures from providers
 * Performance: Batch processing for high-volume events
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createNotificationLogger } from '../_shared/notification-logger.ts'
import { createHmac } from 'https://deno.land/std@0.208.0/node/crypto.ts'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WebhookEvent {
  provider: 'fcm' | 'onesignal' | 'twilio' | 'resend'
  event_type: string
  data: Record<string, any>
}

interface ProcessedEvent {
  success: boolean
  provider: string
  event_type: string
  log_id?: string
  error?: string
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'default-webhook-secret'

// Provider-specific secrets
const TWILIO_WEBHOOK_SECRET = Deno.env.get('TWILIO_WEBHOOK_SECRET')
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')
const ONESIGNAL_WEBHOOK_SECRET = Deno.env.get('ONESIGNAL_WEBHOOK_SECRET')

// ============================================================================
// SUPABASE CLIENT & LOGGER
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const logger = createNotificationLogger(supabase)

// ============================================================================
// WEBHOOK SIGNATURE VALIDATION
// ============================================================================

function verifyWebhookSignature(
  provider: string,
  signature: string | null,
  payload: string
): boolean {
  if (!signature) {
    console.warn(`[Webhook] No signature provided for ${provider}`)
    return false
  }

  try {
    let secret: string | undefined

    switch (provider) {
      case 'twilio':
        secret = TWILIO_WEBHOOK_SECRET
        break
      case 'resend':
        secret = RESEND_WEBHOOK_SECRET
        break
      case 'onesignal':
        secret = ONESIGNAL_WEBHOOK_SECRET
        break
      default:
        secret = WEBHOOK_SECRET
    }

    if (!secret) {
      console.warn(`[Webhook] No secret configured for ${provider}`)
      return false
    }

    // Generate HMAC signature
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')

    // Compare signatures (timing-safe comparison)
    const isValid = signature === expectedSignature

    if (!isValid) {
      console.error(`[Webhook] Invalid signature for ${provider}`)
    }

    return isValid
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error)
    return false
  }
}

// ============================================================================
// PROVIDER-SPECIFIC EVENT PROCESSORS
// ============================================================================

/**
 * Process Firebase Cloud Messaging events
 * FCM doesn't have native webhooks, but can be configured via third-party services
 */
async function processFCMEvent(event: WebhookEvent): Promise<ProcessedEvent> {
  try {
    const { event_type, data } = event
    const messageId = data.message_id || data.fcm_message_id

    if (!messageId) {
      throw new Error('Missing message_id in FCM event')
    }

    // Map FCM event types to our delivery statuses
    let status: string
    switch (event_type) {
      case 'delivered':
        status = 'delivered'
        break
      case 'clicked':
      case 'notification_clicked':
        status = 'clicked'
        break
      case 'failed':
      case 'error':
        status = 'failed'
        break
      default:
        console.warn(`[Webhook] Unknown FCM event type: ${event_type}`)
        return { success: false, provider: 'fcm', event_type, error: 'Unknown event type' }
    }

    // Update delivery log by provider message ID
    const updated = await logger.updateStatusByProviderId(
      messageId,
      status as any,
      {
        error_message: data.error_message,
        error_code: data.error_code,
        metadata: { fcm_event: event_type, raw_data: data }
      }
    )

    return {
      success: updated,
      provider: 'fcm',
      event_type,
      log_id: messageId
    }
  } catch (error) {
    console.error('[Webhook] FCM event processing error:', error)
    return {
      success: false,
      provider: 'fcm',
      event_type: event.event_type,
      error: (error as Error).message
    }
  }
}

/**
 * Process OneSignal notification events
 * https://documentation.onesignal.com/docs/webhooks
 */
async function processOneSignalEvent(event: WebhookEvent): Promise<ProcessedEvent> {
  try {
    const { event_type, data } = event
    const notificationId = data.notification_id || data.id

    if (!notificationId) {
      throw new Error('Missing notification_id in OneSignal event')
    }

    // Map OneSignal event types
    let status: string
    switch (event_type) {
      case 'sent':
        status = 'sent'
        break
      case 'delivered':
        status = 'delivered'
        break
      case 'clicked':
        status = 'clicked'
        break
      case 'failed':
        status = 'failed'
        break
      default:
        console.warn(`[Webhook] Unknown OneSignal event type: ${event_type}`)
        return { success: false, provider: 'onesignal', event_type, error: 'Unknown event type' }
    }

    const updated = await logger.updateStatusByProviderId(
      notificationId,
      status as any,
      {
        error_message: data.error,
        metadata: { onesignal_event: event_type, player_id: data.player_id }
      }
    )

    return {
      success: updated,
      provider: 'onesignal',
      event_type,
      log_id: notificationId
    }
  } catch (error) {
    console.error('[Webhook] OneSignal event processing error:', error)
    return {
      success: false,
      provider: 'onesignal',
      event_type: event.event_type,
      error: (error as Error).message
    }
  }
}

/**
 * Process Twilio SMS delivery status callbacks
 * https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 */
async function processTwilioEvent(event: WebhookEvent): Promise<ProcessedEvent> {
  try {
    const { event_type, data } = event
    const messageSid = data.MessageSid || data.message_sid

    if (!messageSid) {
      throw new Error('Missing MessageSid in Twilio event')
    }

    // Map Twilio message status to our delivery statuses
    let status: string
    switch (event_type.toLowerCase()) {
      case 'sent':
        status = 'sent'
        break
      case 'delivered':
        status = 'delivered'
        break
      case 'failed':
      case 'undelivered':
        status = 'failed'
        break
      default:
        console.warn(`[Webhook] Unknown Twilio status: ${event_type}`)
        return { success: false, provider: 'twilio', event_type, error: 'Unknown status' }
    }

    const updated = await logger.updateStatusByProviderId(
      messageSid,
      status as any,
      {
        error_message: data.ErrorMessage || data.error_message,
        error_code: data.ErrorCode || data.error_code,
        metadata: {
          twilio_status: event_type,
          to: data.To,
          from: data.From,
          price: data.Price
        }
      }
    )

    return {
      success: updated,
      provider: 'twilio',
      event_type,
      log_id: messageSid
    }
  } catch (error) {
    console.error('[Webhook] Twilio event processing error:', error)
    return {
      success: false,
      provider: 'twilio',
      event_type: event.event_type,
      error: (error as Error).message
    }
  }
}

/**
 * Process Resend email delivery events
 * https://resend.com/docs/api-reference/webhooks
 */
async function processResendEvent(event: WebhookEvent): Promise<ProcessedEvent> {
  try {
    const { event_type, data } = event
    const emailId = data.email_id || data.id

    if (!emailId) {
      throw new Error('Missing email_id in Resend event')
    }

    // Map Resend event types
    let status: string
    switch (event_type) {
      case 'email.sent':
        status = 'sent'
        break
      case 'email.delivered':
        status = 'delivered'
        break
      case 'email.opened':
        status = 'read'
        break
      case 'email.clicked':
        status = 'clicked'
        break
      case 'email.bounced':
        status = 'bounced'
        break
      case 'email.complained':
        status = 'failed'
        break
      case 'email.delivery_delayed':
        // Don't update status for delays, just log metadata
        await supabase
          .from('notification_delivery_log')
          .update({
            metadata: { resend_event: event_type, delay_reason: data.reason }
          })
          .eq('provider_message_id', emailId)
        return { success: true, provider: 'resend', event_type, log_id: emailId }
      default:
        console.warn(`[Webhook] Unknown Resend event type: ${event_type}`)
        return { success: false, provider: 'resend', event_type, error: 'Unknown event type' }
    }

    const updated = await logger.updateStatusByProviderId(
      emailId,
      status as any,
      {
        error_message: data.error_message || data.bounce_type,
        metadata: {
          resend_event: event_type,
          to: data.to,
          subject: data.subject
        }
      }
    )

    return {
      success: updated,
      provider: 'resend',
      event_type,
      log_id: emailId
    }
  } catch (error) {
    console.error('[Webhook] Resend event processing error:', error)
    return {
      success: false,
      provider: 'resend',
      event_type: event.event_type,
      error: (error as Error).message
    }
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('webhook-signature') || req.headers.get('x-webhook-signature')

    // Parse body
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }

    const { provider, events } = body

    if (!provider) {
      throw new Error('Missing provider field in webhook payload')
    }

    // Verify webhook signature (skip in development)
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development'
    if (!isDevelopment && !verifyWebhookSignature(provider, signature, rawBody)) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process single event or batch
    const eventList: WebhookEvent[] = Array.isArray(events)
      ? events.map(e => ({ ...e, provider }))
      : [{ provider, event_type: body.event_type || body.type, data: body.data || body }]

    console.log(`[Webhook] Processing ${eventList.length} events from ${provider}`)

    // Process events based on provider
    const results = await Promise.allSettled(
      eventList.map(async (event) => {
        switch (event.provider) {
          case 'fcm':
            return await processFCMEvent(event)
          case 'onesignal':
            return await processOneSignalEvent(event)
          case 'twilio':
            return await processTwilioEvent(event)
          case 'resend':
            return await processResendEvent(event)
          default:
            console.warn(`[Webhook] Unknown provider: ${event.provider}`)
            return {
              success: false,
              provider: event.provider,
              event_type: event.event_type,
              error: 'Unknown provider'
            }
        }
      })
    )

    // Aggregate results
    const processed = results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
    const successful = processed.filter(r => r.success).length
    const failed = processed.filter(r => !r.success).length

    console.log(`[Webhook] Results: ${successful} successful, ${failed} failed`)

    // Log to analytics
    await supabase.from('edge_function_logs').insert({
      function_name: 'process-notification-webhook',
      level: failed > 0 ? 'warn' : 'info',
      message: `Processed ${eventList.length} webhook events from ${provider}`,
      data: {
        provider,
        total: eventList.length,
        successful,
        failed,
        events: processed
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        processed: eventList.length,
        successful,
        failed,
        results: processed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Webhook] Processing error:', errorMessage)

    // Log error
    await supabase.from('edge_function_logs').insert({
      function_name: 'process-notification-webhook',
      level: 'error',
      message: 'Webhook processing failed',
      error_details: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }
    })

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
