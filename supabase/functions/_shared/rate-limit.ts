// Rate limiting utilities for Edge Functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { RateLimitError } from './errors.ts'

interface RateLimitConfig {
  max_requests: number
  window_seconds: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'slack-send-message': { max_requests: 100, window_seconds: 60 },
  'webhook-deliver': { max_requests: 500, window_seconds: 60 },
  'notification-send': { max_requests: 200, window_seconds: 60 },
  'default': { max_requests: 60, window_seconds: 60 },
}

// Check rate limit for a specific key
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  endpoint: string
): Promise<void> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default']
  const windowStart = Math.floor(Date.now() / 1000) - config.window_seconds

  try {
    // Query recent requests from rate_limit_log table
    const { data, error } = await supabase
      .from('rate_limit_log')
      .select('id')
      .eq('rate_key', key)
      .gte('timestamp', windowStart)

    if (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - don't block if rate limit check fails
      return
    }

    const requestCount = data?.length || 0

    if (requestCount >= config.max_requests) {
      const retryAfter = config.window_seconds
      throw new RateLimitError(retryAfter)
    }

    // Log this request
    await supabase.from('rate_limit_log').insert({
      rate_key: key,
      endpoint,
      timestamp: Math.floor(Date.now() / 1000),
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    // Fail open on other errors
    console.error('Rate limit error:', error)
  }
}

// Generate rate limit key
export function getRateLimitKey(dealerId: number, userId: string, endpoint: string): string {
  return `${endpoint}:dealer:${dealerId}:user:${userId}`
}

// Clean up old rate limit logs (run periodically)
export async function cleanupRateLimitLogs(
  supabase: SupabaseClient,
  olderThanSeconds: number = 3600
): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds

  await supabase
    .from('rate_limit_log')
    .delete()
    .lt('timestamp', cutoff)
}
