// Shared types for Settings Hub integrations

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    request_id: string
  }
}

export interface SlackConfig {
  id: string
  dealer_id: number
  bot_token: string
  workspace_id: string
  workspace_name: string
  default_channel: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface WebhookConfig {
  id: string
  dealer_id: number
  name: string
  url: string
  events: string[]
  headers?: Record<string, string>
  auth_type?: 'none' | 'bearer' | 'basic' | 'api_key'
  auth_config?: Record<string, string>
  enabled: boolean
  retry_policy: {
    max_attempts: number
    backoff_type: 'linear' | 'exponential'
    initial_delay_ms: number
  }
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: any
  response_status?: number
  response_body?: string
  delivery_attempts: number
  delivered_at?: string
  failed_at?: string
  next_retry_at?: string
  created_at: string
}

export interface NotificationTemplate {
  id: string
  dealer_id: number
  name: string
  channel: 'email' | 'sms' | 'slack' | 'push'
  subject?: string
  body: string
  variables: string[]
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  dealer_id: number
  user_id: string
  event_type: string
  resource_type: string
  resource_id?: string
  metadata: any
  ip_address?: string
  user_agent?: string
  created_at: string
}
