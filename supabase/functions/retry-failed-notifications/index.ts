/**
 * Retry Failed Notifications - Automated Recovery
 *
 * Cron job that automatically retries failed notification deliveries
 * with exponential backoff and max retry limits.
 *
 * Features:
 * - Exponential backoff strategy (1h, 4h, 12h)
 * - Max 3 retry attempts per notification
 * - Channel-specific retry logic
 * - Rate limiting to prevent API overload
 * - Detailed retry analytics
 *
 * Schedule: Run every hour via Supabase cron
 * Trigger: pg_cron or external scheduler
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createNotificationLogger } from '../_shared/notification-logger.ts'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FailedDelivery {
  id: string
  dealership_id: string
  notification_id: string
  user_id: string
  channel: 'push' | 'email' | 'sms' | 'in_app'
  status: string
  retry_count: number
  failed_at: string
  error_message: string | null
  error_code: string | null
  notification_title: string | null
  notification_body: string | null
  device_token: string | null
  metadata: Record<string, any> | null
}

interface RetryResult {
  delivery_id: string
  success: boolean
  channel: string
  retry_attempt: number
  error?: string
}

interface RetryStats {
  total_attempts: number
  successful: number
  failed: number
  by_channel: Record<string, { attempts: number; successful: number; failed: number }>
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Retry configuration
const MAX_RETRY_COUNT = 3
const RETRY_BACKOFF_HOURS = [1, 4, 12] // Exponential backoff: 1h, 4h, 12h
const MAX_RETRIES_PER_RUN = 100 // Prevent API overload
const RETRY_RATE_LIMIT_MS = 1000 // 1 second between retries

// ============================================================================
// SUPABASE CLIENT & LOGGER
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const logger = createNotificationLogger(supabase)

// ============================================================================
// RETRY ELIGIBILITY CHECK
// ============================================================================

function isEligibleForRetry(delivery: FailedDelivery): boolean {
  // Check max retry count
  if (delivery.retry_count >= MAX_RETRY_COUNT) {
    return false
  }

  // Calculate time since last failure
  const failedAt = new Date(delivery.failed_at)
  const now = new Date()
  const hoursSinceFailure = (now.getTime() - failedAt.getTime()) / (1000 * 60 * 60)

  // Get backoff time for current retry attempt
  const backoffHours = RETRY_BACKOFF_HOURS[delivery.retry_count] || RETRY_BACKOFF_HOURS[RETRY_BACKOFF_HOURS.length - 1]

  // Only retry if enough time has passed
  return hoursSinceFailure >= backoffHours
}

// ============================================================================
// CHANNEL-SPECIFIC RETRY LOGIC
// ============================================================================

async function retryPushNotification(delivery: FailedDelivery): Promise<boolean> {
  try {
    // Validate we have necessary data
    if (!delivery.notification_title || !delivery.notification_body) {
      console.warn(`[Retry] Missing notification content for delivery ${delivery.id}`)
      return false
    }

    // Call send-notification function
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId: delivery.user_id,
        dealerId: parseInt(delivery.dealership_id),
        title: delivery.notification_title,
        body: delivery.notification_body,
        url: delivery.metadata?.url,
        data: delivery.metadata?.data
      }
    })

    if (error) {
      console.error(`[Retry] Push notification retry failed for ${delivery.id}:`, error)
      return false
    }

    return data?.success === true && data?.sent > 0
  } catch (error) {
    console.error(`[Retry] Push notification retry exception for ${delivery.id}:`, error)
    return false
  }
}

async function retryEmailNotification(delivery: FailedDelivery): Promise<boolean> {
  try {
    // Get user email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', delivery.user_id)
      .single()

    if (profileError || !profile?.email) {
      console.warn(`[Retry] No email found for user ${delivery.user_id}`)
      return false
    }

    // Call appropriate email function based on metadata
    const emailFunction = delivery.metadata?.email_type === 'invitation'
      ? 'send-invitation-email'
      : 'send-order-email'

    const { data, error } = await supabase.functions.invoke(emailFunction, {
      body: {
        to: profile.email,
        subject: delivery.notification_title || 'Notification',
        html: delivery.notification_body || '',
        dealerId: delivery.dealership_id,
        ...delivery.metadata
      }
    })

    if (error) {
      console.error(`[Retry] Email retry failed for ${delivery.id}:`, error)
      return false
    }

    return data?.success === true
  } catch (error) {
    console.error(`[Retry] Email retry exception for ${delivery.id}:`, error)
    return false
  }
}

async function retrySMSNotification(delivery: FailedDelivery): Promise<boolean> {
  try {
    // Get user phone
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', delivery.user_id)
      .single()

    if (profileError || !profile?.phone) {
      console.warn(`[Retry] No phone found for user ${delivery.user_id}`)
      return false
    }

    // Call SMS function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: profile.phone,
        message: delivery.notification_body || '',
        orderNumber: delivery.metadata?.order_number || 'N/A',
        dealerId: delivery.dealership_id
      }
    })

    if (error) {
      console.error(`[Retry] SMS retry failed for ${delivery.id}:`, error)
      return false
    }

    return data?.success === true
  } catch (error) {
    console.error(`[Retry] SMS retry exception for ${delivery.id}:`, error)
    return false
  }
}

async function retryInAppNotification(delivery: FailedDelivery): Promise<boolean> {
  try {
    // In-app notifications: insert directly to notification_log
    const { error } = await supabase
      .from('notification_log')
      .insert({
        user_id: delivery.user_id,
        dealer_id: parseInt(delivery.dealership_id),
        title: delivery.notification_title || 'Notification',
        message: delivery.notification_body || '',
        type: delivery.metadata?.notification_type || 'info',
        entity_type: delivery.metadata?.entity_type,
        entity_id: delivery.metadata?.entity_id,
        metadata: delivery.metadata
      })

    if (error) {
      console.error(`[Retry] In-app notification retry failed for ${delivery.id}:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`[Retry] In-app notification retry exception for ${delivery.id}:`, error)
    return false
  }
}

// ============================================================================
// RETRY ORCHESTRATOR
// ============================================================================

async function retryDelivery(delivery: FailedDelivery): Promise<RetryResult> {
  const retryAttempt = delivery.retry_count + 1
  console.log(`[Retry] Attempting retry ${retryAttempt}/${MAX_RETRY_COUNT} for delivery ${delivery.id} (${delivery.channel})`)

  let success = false

  try {
    // Channel-specific retry
    switch (delivery.channel) {
      case 'push':
        success = await retryPushNotification(delivery)
        break
      case 'email':
        success = await retryEmailNotification(delivery)
        break
      case 'sms':
        success = await retrySMSNotification(delivery)
        break
      case 'in_app':
        success = await retryInAppNotification(delivery)
        break
      default:
        console.warn(`[Retry] Unknown channel: ${delivery.channel}`)
        return {
          delivery_id: delivery.id,
          success: false,
          channel: delivery.channel,
          retry_attempt: retryAttempt,
          error: 'Unknown channel'
        }
    }

    // Update delivery log
    if (success) {
      // Mark as sent (will be updated to delivered via webhook)
      await logger.updateStatus(delivery.id, 'sent', {
        retry_count: retryAttempt,
        sent_at: new Date(),
        metadata: {
          ...delivery.metadata,
          retry_successful: true,
          retry_attempt: retryAttempt
        }
      })
    } else {
      // Update retry count and status
      const finalStatus = retryAttempt >= MAX_RETRY_COUNT ? 'failed' : 'failed'
      await logger.updateStatus(delivery.id, finalStatus as any, {
        retry_count: retryAttempt,
        failed_at: new Date(),
        error_message: `Retry ${retryAttempt} failed`,
        metadata: {
          ...delivery.metadata,
          retry_failed: true,
          retry_attempt: retryAttempt
        }
      })
    }

    return {
      delivery_id: delivery.id,
      success,
      channel: delivery.channel,
      retry_attempt: retryAttempt
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Retry] Error retrying delivery ${delivery.id}:`, errorMessage)

    // Update with error
    await logger.updateStatus(delivery.id, 'failed', {
      retry_count: retryAttempt,
      failed_at: new Date(),
      error_message: errorMessage
    })

    return {
      delivery_id: delivery.id,
      success: false,
      channel: delivery.channel,
      retry_attempt: retryAttempt,
      error: errorMessage
    }
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

  const startTime = Date.now()

  try {
    console.log('[Retry] Starting failed notification retry job')

    // Get failed deliveries eligible for retry
    const failedDeliveries = await logger.getFailedDeliveries({
      max_retry_count: MAX_RETRY_COUNT - 1, // Only get deliveries under max retries
      limit: MAX_RETRIES_PER_RUN
    })

    console.log(`[Retry] Found ${failedDeliveries.length} failed deliveries`)

    // Filter by eligibility (backoff time)
    const eligibleDeliveries = failedDeliveries.filter(isEligibleForRetry)

    console.log(`[Retry] ${eligibleDeliveries.length} deliveries eligible for retry`)

    if (eligibleDeliveries.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No failed deliveries eligible for retry',
          total_found: failedDeliveries.length,
          eligible: 0,
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Retry deliveries with rate limiting
    const results: RetryResult[] = []
    for (const delivery of eligibleDeliveries) {
      const result = await retryDelivery(delivery)
      results.push(result)

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, RETRY_RATE_LIMIT_MS))
    }

    // Calculate statistics
    const stats: RetryStats = {
      total_attempts: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      by_channel: {}
    }

    // Group by channel
    for (const result of results) {
      if (!stats.by_channel[result.channel]) {
        stats.by_channel[result.channel] = { attempts: 0, successful: 0, failed: 0 }
      }
      stats.by_channel[result.channel].attempts++
      if (result.success) {
        stats.by_channel[result.channel].successful++
      } else {
        stats.by_channel[result.channel].failed++
      }
    }

    const duration = Date.now() - startTime

    console.log('[Retry] Job completed:', stats)

    // Log to analytics
    await supabase.from('edge_function_logs').insert({
      function_name: 'retry-failed-notifications',
      level: 'info',
      message: `Retry job completed: ${stats.successful}/${stats.total_attempts} successful`,
      data: {
        stats,
        duration_ms: duration,
        total_found: failedDeliveries.length,
        eligible: eligibleDeliveries.length
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        duration_ms: duration,
        total_found: failedDeliveries.length,
        eligible: eligibleDeliveries.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const duration = Date.now() - startTime
    console.error('[Retry] Job error:', errorMessage)

    // Log error
    await supabase.from('edge_function_logs').insert({
      function_name: 'retry-failed-notifications',
      level: 'error',
      message: 'Retry job failed',
      error_details: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration_ms: duration
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
