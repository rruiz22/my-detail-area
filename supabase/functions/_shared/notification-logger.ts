/**
 * Notification Delivery Logger - Enterprise-Grade
 *
 * Handles comprehensive logging of notification deliveries across all channels
 * with retry logic, batch operations, and performance tracking.
 *
 * Features:
 * - Multi-channel support (push, email, sms, in_app)
 * - Automatic retry logic with exponential backoff
 * - Batch insert operations for performance
 * - Latency tracking and analytics correlation
 * - Provider metadata tracking (FCM, Resend, Twilio)
 * - Error handling with graceful degradation
 *
 * @module notification-logger
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app'
export type DeliveryStatus =
  | 'pending'    // Initial state, queued for sending
  | 'sent'       // Successfully sent to provider
  | 'delivered'  // Confirmed delivered to device/inbox
  | 'failed'     // Permanent failure
  | 'clicked'    // User clicked/opened notification
  | 'read'       // User read notification (in-app)
  | 'bounced'    // Email bounced
  | 'unsubscribed' // User unsubscribed

export interface DeliveryLog {
  // Required fields
  dealership_id: string
  notification_id: string
  user_id: string
  channel: NotificationChannel
  status: DeliveryStatus

  // Optional timing fields
  sent_at?: Date | string
  delivered_at?: Date | string
  clicked_at?: Date | string
  read_at?: Date | string
  failed_at?: Date | string

  // Provider tracking
  provider?: string // 'fcm', 'resend', 'twilio', 'web-push'
  provider_message_id?: string
  provider_response?: Record<string, any>

  // Performance tracking
  latency_ms?: number
  retry_count?: number

  // Error tracking
  error_message?: string
  error_code?: string
  error_details?: Record<string, any>

  // Notification content (for analytics)
  notification_title?: string
  notification_body?: string
  notification_type?: string

  // Device/platform info
  device_type?: string // 'ios', 'android', 'web', 'windows'
  platform?: string
  device_token?: string

  // Additional metadata
  metadata?: Record<string, any>
}

export interface DeliveryLogResponse {
  id: string
  created_at: string
}

export interface BulkDeliveryResult {
  success: boolean
  inserted: number
  failed: number
  errors?: Array<{ index: number; error: string }>
}

export interface UpdateStatusOptions {
  delivered_at?: Date | string
  clicked_at?: Date | string
  read_at?: Date | string
  failed_at?: Date | string
  error_message?: string
  error_code?: string
  provider_response?: Record<string, any>
  latency_ms?: number
  retry_count?: number
  metadata?: Record<string, any>
}

// ============================================================================
// NOTIFICATION LOGGER CLASS
// ============================================================================

export class NotificationLogger {
  private supabase: SupabaseClient
  private readonly TABLE_NAME = 'notification_delivery_log'
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY_MS = 1000
  private readonly BATCH_SIZE = 50

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Log a single notification delivery attempt
   * Non-blocking operation with automatic retry logic
   */
  async logDelivery(log: DeliveryLog): Promise<DeliveryLogResponse | null> {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const payload = this.prepareLogPayload(log)

        const { data, error } = await this.supabase
          .from(this.TABLE_NAME)
          .insert(payload)
          .select('id, created_at')
          .single()

        if (error) {
          throw error
        }

        // Log successful insert performance
        const duration = Date.now() - startTime
        if (duration > 500) {
          console.warn(`[NotificationLogger] Slow delivery log insert: ${duration}ms (attempt ${attempt})`)
        }

        return data
      } catch (error) {
        lastError = error as Error
        console.error(`[NotificationLogger] Delivery log failed (attempt ${attempt}/${this.MAX_RETRIES}):`, error)

        // Don't retry on validation errors
        if (this.isValidationError(error)) {
          console.error('[NotificationLogger] Validation error, skipping retries:', error)
          break
        }

        // Exponential backoff for retries
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    // Log failure but don't throw - this is non-blocking
    console.error('[NotificationLogger] Failed to log delivery after retries:', lastError)
    return null
  }

  /**
   * Update the status of an existing delivery log
   * Used for tracking delivery confirmations, clicks, and failures
   */
  async updateStatus(
    logId: string,
    status: DeliveryStatus,
    options: UpdateStatusOptions = {}
  ): Promise<boolean> {
    try {
      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      }

      // Add timing fields based on status
      if (status === 'delivered' && !options.delivered_at) {
        updatePayload.delivered_at = new Date().toISOString()
      }
      if (status === 'clicked' && !options.clicked_at) {
        updatePayload.clicked_at = new Date().toISOString()
      }
      if (status === 'read' && !options.read_at) {
        updatePayload.read_at = new Date().toISOString()
      }
      if (status === 'failed' && !options.failed_at) {
        updatePayload.failed_at = new Date().toISOString()
      }

      // Merge additional options
      Object.assign(updatePayload, this.sanitizeOptions(options))

      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .update(updatePayload)
        .eq('id', logId)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error('[NotificationLogger] Failed to update status:', error)
      return false
    }
  }

  /**
   * Update status by provider message ID
   * Useful for webhook handlers that only have provider IDs
   */
  async updateStatusByProviderId(
    providerMessageId: string,
    status: DeliveryStatus,
    options: UpdateStatusOptions = {}
  ): Promise<boolean> {
    try {
      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      }

      // Add timing fields
      if (status === 'delivered') {
        updatePayload.delivered_at = new Date().toISOString()
      }
      if (status === 'clicked') {
        updatePayload.clicked_at = new Date().toISOString()
      }
      if (status === 'failed') {
        updatePayload.failed_at = new Date().toISOString()
      }

      Object.assign(updatePayload, this.sanitizeOptions(options))

      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .update(updatePayload)
        .eq('provider_message_id', providerMessageId)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error('[NotificationLogger] Failed to update by provider ID:', error)
      return false
    }
  }

  /**
   * Batch insert multiple delivery logs
   * Optimized for mass notification sending (e.g., broadcast messages)
   */
  async logBulkDelivery(logs: DeliveryLog[]): Promise<BulkDeliveryResult> {
    if (logs.length === 0) {
      return { success: true, inserted: 0, failed: 0 }
    }

    const batches = this.chunkArray(logs, this.BATCH_SIZE)
    let totalInserted = 0
    let totalFailed = 0
    const errors: Array<{ index: number; error: string }> = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const payloads = batch.map(log => this.prepareLogPayload(log))

      try {
        const { data, error } = await this.supabase
          .from(this.TABLE_NAME)
          .insert(payloads)
          .select('id')

        if (error) {
          throw error
        }

        totalInserted += data?.length || 0
      } catch (error) {
        console.error(`[NotificationLogger] Batch insert failed (batch ${batchIndex + 1}/${batches.length}):`, error)
        totalFailed += batch.length

        // Record error for each item in failed batch
        batch.forEach((_, itemIndex) => {
          const globalIndex = batchIndex * this.BATCH_SIZE + itemIndex
          errors.push({
            index: globalIndex,
            error: (error as Error).message
          })
        })
      }
    }

    const result: BulkDeliveryResult = {
      success: totalFailed === 0,
      inserted: totalInserted,
      failed: totalFailed
    }

    if (errors.length > 0) {
      result.errors = errors
    }

    return result
  }

  /**
   * Batch update statuses for multiple delivery logs
   * Useful for webhook handlers processing multiple events
   */
  async bulkUpdateStatus(
    logIds: string[],
    status: DeliveryStatus,
    options: UpdateStatusOptions = {}
  ): Promise<number> {
    try {
      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'delivered') {
        updatePayload.delivered_at = new Date().toISOString()
      }

      Object.assign(updatePayload, this.sanitizeOptions(options))

      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .update(updatePayload)
        .in('id', logIds)
        .select('id')

      if (error) {
        throw error
      }

      return data?.length || 0
    } catch (error) {
      console.error('[NotificationLogger] Bulk update failed:', error)
      return 0
    }
  }

  /**
   * Get failed deliveries that need retry
   */
  async getFailedDeliveries(options: {
    dealership_id?: string
    channel?: NotificationChannel
    max_retry_count?: number
    failed_since?: Date | string
    limit?: number
  } = {}): Promise<DeliveryLog[]> {
    try {
      let query = this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('status', 'failed')

      if (options.dealership_id) {
        query = query.eq('dealership_id', options.dealership_id)
      }

      if (options.channel) {
        query = query.eq('channel', options.channel)
      }

      if (options.max_retry_count !== undefined) {
        query = query.lte('retry_count', options.max_retry_count)
      }

      if (options.failed_since) {
        const since = options.failed_since instanceof Date
          ? options.failed_since.toISOString()
          : options.failed_since
        query = query.gte('failed_at', since)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('[NotificationLogger] Failed to get failed deliveries:', error)
      return []
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private prepareLogPayload(log: DeliveryLog): Record<string, any> {
    const payload: Record<string, any> = {
      dealership_id: log.dealership_id,
      notification_id: log.notification_id,
      user_id: log.user_id,
      channel: log.channel,
      status: log.status,
      created_at: new Date().toISOString()
    }

    // Add optional fields if present
    if (log.sent_at) {
      payload.sent_at = log.sent_at instanceof Date ? log.sent_at.toISOString() : log.sent_at
    }
    if (log.delivered_at) {
      payload.delivered_at = log.delivered_at instanceof Date ? log.delivered_at.toISOString() : log.delivered_at
    }
    if (log.clicked_at) {
      payload.clicked_at = log.clicked_at instanceof Date ? log.clicked_at.toISOString() : log.clicked_at
    }
    if (log.read_at) {
      payload.read_at = log.read_at instanceof Date ? log.read_at.toISOString() : log.read_at
    }
    if (log.failed_at) {
      payload.failed_at = log.failed_at instanceof Date ? log.failed_at.toISOString() : log.failed_at
    }

    // Provider tracking
    if (log.provider) payload.provider = log.provider
    if (log.provider_message_id) payload.provider_message_id = log.provider_message_id
    if (log.provider_response) payload.provider_response = log.provider_response

    // Performance & error tracking
    if (log.latency_ms !== undefined) payload.latency_ms = log.latency_ms
    if (log.retry_count !== undefined) payload.retry_count = log.retry_count
    if (log.error_message) payload.error_message = log.error_message
    if (log.error_code) payload.error_code = log.error_code
    if (log.error_details) payload.error_details = log.error_details

    // Content tracking
    if (log.notification_title) payload.notification_title = log.notification_title
    if (log.notification_body) payload.notification_body = log.notification_body
    if (log.notification_type) payload.notification_type = log.notification_type

    // Device info
    if (log.device_type) payload.device_type = log.device_type
    if (log.platform) payload.platform = log.platform
    if (log.device_token) payload.device_token = log.device_token

    // Metadata
    if (log.metadata) payload.metadata = log.metadata

    return payload
  }

  private sanitizeOptions(options: UpdateStatusOptions): Record<string, any> {
    const sanitized: Record<string, any> = {}

    if (options.delivered_at) {
      sanitized.delivered_at = options.delivered_at instanceof Date
        ? options.delivered_at.toISOString()
        : options.delivered_at
    }
    if (options.clicked_at) {
      sanitized.clicked_at = options.clicked_at instanceof Date
        ? options.clicked_at.toISOString()
        : options.clicked_at
    }
    if (options.read_at) {
      sanitized.read_at = options.read_at instanceof Date
        ? options.read_at.toISOString()
        : options.read_at
    }
    if (options.failed_at) {
      sanitized.failed_at = options.failed_at instanceof Date
        ? options.failed_at.toISOString()
        : options.failed_at
    }
    if (options.error_message) sanitized.error_message = options.error_message
    if (options.error_code) sanitized.error_code = options.error_code
    if (options.provider_response) sanitized.provider_response = options.provider_response
    if (options.latency_ms !== undefined) sanitized.latency_ms = options.latency_ms
    if (options.retry_count !== undefined) sanitized.retry_count = options.retry_count
    if (options.metadata) {
      sanitized.metadata = options.metadata
    }

    return sanitized
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private isValidationError(error: any): boolean {
    const validationErrorCodes = ['23505', '23503', '23502', 'PGRST204']
    return validationErrorCodes.includes(error?.code)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new NotificationLogger instance
 * Convenience factory function for cleaner imports
 */
export function createNotificationLogger(supabase: SupabaseClient): NotificationLogger {
  return new NotificationLogger(supabase)
}
