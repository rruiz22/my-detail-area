# Settings Hub - Frontend Integration Examples
## React + TypeScript Implementation Guide

---

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Slack Integration](#slack-integration)
3. [Webhook Management](#webhook-management)
4. [Notification Templates](#notification-templates)
5. [Audit Logs Viewer](#audit-logs-viewer)
6. [Error Handling](#error-handling)

---

## Setup & Configuration

### Environment Variables

`.env.local`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SLACK_CLIENT_ID=123456789.123456789
VITE_APP_URL=https://your-app.com
```

### Supabase Client Setup

`src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### API Client Wrapper

`src/lib/api-client.ts`:
```typescript
import { supabase } from './supabase'

interface APIResponse<T = any> {
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

export async function callEdgeFunction<T = any>(
  functionName: string,
  payload: any
): Promise<APIResponse<T>> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    return {
      success: false,
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message,
      },
    }
  }

  return data as APIResponse<T>
}
```

---

## Slack Integration

### Slack Integration Page

`src/pages/Settings/SlackIntegration.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { callEdgeFunction } from '@/lib/api-client'

interface SlackIntegration {
  id: string
  dealer_id: number
  config: {
    team_id: string
    team_name: string
    bot_user_id: string
    incoming_webhook_url?: string
    incoming_webhook_channel?: string
  }
  enabled: boolean
  status: string
  created_at: string
  updated_at: string
}

export function SlackIntegration() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [integration, setIntegration] = useState<SlackIntegration | null>(null)
  const [dealerId, setDealerId] = useState<number | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchIntegration()
  }, [])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('dealer_id')
      .eq('id', user.id)
      .single()

    setDealerId(userData?.dealer_id)
  }

  async function fetchIntegration() {
    if (!dealerId) return

    const { data, error } = await supabase
      .from('dealer_integrations')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('integration_type', 'slack')
      .maybeSingle()

    if (error) {
      console.error('Error fetching integration:', error)
      return
    }

    setIntegration(data)
  }

  async function handleConnectSlack() {
    if (!dealerId) {
      toast({
        title: 'Error',
        description: 'User dealer not found',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Create OAuth state for CSRF protection
      const stateData = {
        dealer_id: dealerId,
        user_id: user!.id,
        timestamp: Date.now(),
      }

      const stateToken = btoa(JSON.stringify(stateData))

      // Store state in database
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state_token: stateToken,
          dealer_id: dealerId,
          user_id: user!.id,
          integration_type: 'slack',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })

      if (stateError) {
        throw stateError
      }

      // Build Slack OAuth URL
      const clientId = import.meta.env.VITE_SLACK_CLIENT_ID
      const redirectUri = `${import.meta.env.VITE_APP_URL}/api/slack/callback`
      const scopes = 'chat:write,channels:read,groups:read'

      const slackOAuthUrl =
        `https://slack.com/oauth/v2/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `state=${stateToken}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`

      // Redirect to Slack
      window.location.href = slackOAuthUrl
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to Slack',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleTestConnection() {
    if (!integration) return

    setLoading(true)

    try {
      const response = await callEdgeFunction('slack-test-connection', {
        dealer_id: dealerId,
        integration_id: integration.id,
      })

      if (response.success) {
        toast({
          title: 'Connection Successful',
          description: `Connected to ${response.data.workspace_name} (${response.data.channel_count} channels)`,
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: response.error?.message || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSendTestMessage() {
    if (!integration) return

    setLoading(true)

    try {
      const response = await callEdgeFunction('slack-send-message', {
        dealer_id: dealerId,
        channel: integration.config.incoming_webhook_channel || '#general',
        text: '🎉 Test message from MyDetailArea Settings Hub!',
      })

      if (response.success) {
        toast({
          title: 'Message Sent',
          description: `Test message sent successfully`,
        })
      } else {
        toast({
          title: 'Send Failed',
          description: response.error?.message || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!integration) return

    if (!confirm('Are you sure you want to disconnect Slack?')) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('dealer_integrations')
        .delete()
        .eq('id', integration.id)

      if (error) throw error

      toast({
        title: 'Disconnected',
        description: 'Slack integration has been removed',
      })

      setIntegration(null)
    } catch (error) {
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to remove integration',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Slack Integration</h2>
        <p className="text-muted-foreground">
          Connect your Slack workspace to receive real-time notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slack Workspace</CardTitle>
          <CardDescription>
            Configure Slack to receive notifications about orders, vehicles, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{integration.config.team_name}</h3>
                    <Badge variant={integration.enabled ? 'default' : 'secondary'}>
                      {integration.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(integration.created_at).toLocaleDateString()}
                  </p>
                  {integration.config.incoming_webhook_channel && (
                    <p className="text-sm text-muted-foreground">
                      Default channel: {integration.config.incoming_webhook_channel}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendTestMessage}
                    disabled={loading}
                  >
                    Send Test Message
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Slack workspace to start receiving notifications
              </p>
              <Button onClick={handleConnectSlack} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Slack Workspace'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### OAuth Callback Handler

`src/pages/SlackCallback.tsx`:
```typescript
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'

export function SlackCallback() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    const slack = searchParams.get('slack')

    if (error) {
      toast({
        title: 'Connection Failed',
        description: `Slack error: ${error}`,
        variant: 'destructive',
      })
      navigate('/settings/integrations')
      return
    }

    if (slack === 'connected') {
      toast({
        title: 'Connected!',
        description: 'Slack workspace connected successfully',
      })
      navigate('/settings/integrations')
      return
    }

    // If no params, redirect
    navigate('/settings/integrations')
  }, [searchParams, navigate, toast])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Connecting to Slack...</h2>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  )
}
```

---

## Webhook Management

### Webhook List Component

`src/pages/Settings/Webhooks.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { callEdgeFunction } from '@/lib/api-client'
import { CreateWebhookModal } from './CreateWebhookModal'

interface Webhook {
  id: string
  dealer_id: number
  integration_name: string
  config: {
    url: string
    events: string[]
    headers?: Record<string, string>
    auth_type?: 'none' | 'bearer' | 'basic' | 'api_key'
  }
  enabled: boolean
  status: string
  created_at: string
}

export function Webhooks() {
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [dealerId, setDealerId] = useState<number | null>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (dealerId) {
      fetchWebhooks()
    }
  }, [dealerId])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('dealer_id')
      .eq('id', user.id)
      .single()

    setDealerId(userData?.dealer_id)
  }

  async function fetchWebhooks() {
    const { data, error } = await supabase
      .from('dealer_integrations')
      .select('*')
      .eq('dealer_id', dealerId!)
      .eq('integration_type', 'webhook')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return
    }

    setWebhooks(data || [])
  }

  async function handleTestWebhook(webhook: Webhook) {
    setLoading(true)

    try {
      const response = await callEdgeFunction('webhook-test', {
        url: webhook.config.url,
        headers: webhook.config.headers,
        auth_type: webhook.config.auth_type,
        auth_config: webhook.config.auth_config,
      })

      if (response.success && response.data.connection_test === 'passed') {
        toast({
          title: 'Test Successful',
          description: `Response time: ${response.data.response_time_ms}ms`,
        })
      } else {
        toast({
          title: 'Test Failed',
          description: response.error?.message || 'Connection test failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Test Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return
    }

    const { error } = await supabase
      .from('dealer_integrations')
      .delete()
      .eq('id', webhookId)

    if (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Deleted',
      description: 'Webhook has been removed',
    })

    fetchWebhooks()
  }

  async function handleToggleWebhook(webhookId: string, enabled: boolean) {
    const { error } = await supabase
      .from('dealer_integrations')
      .update({ enabled: !enabled })
      .eq('id', webhookId)

    if (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update webhook',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: enabled ? 'Disabled' : 'Enabled',
      description: `Webhook has been ${enabled ? 'disabled' : 'enabled'}`,
    })

    fetchWebhooks()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">
            Configure webhooks to receive event notifications
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Add Webhook
        </Button>
      </div>

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No webhooks configured</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Your First Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {webhook.integration_name}
                      <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                        {webhook.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{webhook.config.url}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={loading}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleWebhook(webhook.id, webhook.enabled)}
                    >
                      {webhook.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Events:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {webhook.config.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {webhook.config.auth_type && webhook.config.auth_type !== 'none' && (
                    <div>
                      <span className="text-sm font-medium">Authentication:</span>
                      <Badge variant="outline" className="ml-2">
                        {webhook.config.auth_type.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateWebhookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchWebhooks()
        }}
        dealerId={dealerId}
      />
    </div>
  )
}
```

### Create Webhook Modal

`src/pages/Settings/CreateWebhookModal.tsx`:
```typescript
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { callEdgeFunction } from '@/lib/api-client'

const AVAILABLE_EVENTS = [
  { value: 'order.created', label: 'Order Created' },
  { value: 'order.updated', label: 'Order Updated' },
  { value: 'order.status_changed', label: 'Order Status Changed' },
  { value: 'order.completed', label: 'Order Completed' },
  { value: 'vehicle.created', label: 'Vehicle Created' },
  { value: 'vehicle.updated', label: 'Vehicle Updated' },
  { value: 'payment.received', label: 'Payment Received' },
]

interface CreateWebhookModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  dealerId: number | null
}

export function CreateWebhookModal({ open, onClose, onSuccess, dealerId }: CreateWebhookModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    auth_type: 'none' as 'none' | 'bearer' | 'basic' | 'api_key',
    auth_token: '',
    auth_username: '',
    auth_password: '',
    auth_header_name: '',
    auth_api_key: '',
  })

  async function handleTestEndpoint() {
    if (!formData.url) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a webhook URL',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const auth_config: Record<string, string> = {}

      if (formData.auth_type === 'bearer') {
        auth_config.token = formData.auth_token
      } else if (formData.auth_type === 'basic') {
        auth_config.username = formData.auth_username
        auth_config.password = formData.auth_password
      } else if (formData.auth_type === 'api_key') {
        auth_config.header_name = formData.auth_header_name
        auth_config.api_key = formData.auth_api_key
      }

      const response = await callEdgeFunction('webhook-test', {
        url: formData.url,
        auth_type: formData.auth_type,
        auth_config,
      })

      if (response.success && response.data.connection_test === 'passed') {
        toast({
          title: 'Test Successful',
          description: `Endpoint responded in ${response.data.response_time_ms}ms`,
        })
      } else {
        toast({
          title: 'Test Failed',
          description: response.error?.message || 'Endpoint did not respond correctly',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Test Error',
        description: 'Failed to test endpoint',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!dealerId) {
      toast({
        title: 'Error',
        description: 'Dealer ID not found',
        variant: 'destructive',
      })
      return
    }

    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const auth_config: Record<string, string> = {}

      if (formData.auth_type === 'bearer') {
        auth_config.token = formData.auth_token
      } else if (formData.auth_type === 'basic') {
        auth_config.username = formData.auth_username
        auth_config.password = formData.auth_password
      } else if (formData.auth_type === 'api_key') {
        auth_config.header_name = formData.auth_header_name
        auth_config.api_key = formData.auth_api_key
      }

      const { error } = await supabase
        .from('dealer_integrations')
        .insert({
          dealer_id: dealerId,
          integration_type: 'webhook',
          integration_name: formData.name,
          config: {
            url: formData.url,
            events: formData.events,
            auth_type: formData.auth_type,
            auth_config,
          },
          enabled: true,
          created_by: user!.id,
        })

      if (error) throw error

      toast({
        title: 'Webhook Created',
        description: 'Webhook has been configured successfully',
      })

      onSuccess()
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create webhook',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook endpoint to receive event notifications
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Webhook Name</Label>
            <Input
              id="name"
              placeholder="My API Webhook"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="url">Endpoint URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://api.example.com/webhooks"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestEndpoint}
                disabled={loading || !formData.url}
              >
                Test
              </Button>
            </div>
          </div>

          <div>
            <Label>Events to Subscribe</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {AVAILABLE_EVENTS.map((event) => (
                <div key={event.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.value}
                    checked={formData.events.includes(event.value)}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        events: checked
                          ? [...formData.events, event.value]
                          : formData.events.filter((e) => e !== event.value),
                      })
                    }}
                  />
                  <Label htmlFor={event.value} className="cursor-pointer">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="auth_type">Authentication</Label>
            <Select
              value={formData.auth_type}
              onValueChange={(value: any) => setFormData({ ...formData, auth_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="api_key">API Key (Custom Header)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.auth_type === 'bearer' && (
            <div>
              <Label htmlFor="auth_token">Bearer Token</Label>
              <Input
                id="auth_token"
                type="password"
                placeholder="your-bearer-token"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
              />
            </div>
          )}

          {formData.auth_type === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auth_username">Username</Label>
                <Input
                  id="auth_username"
                  value={formData.auth_username}
                  onChange={(e) => setFormData({ ...formData, auth_username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="auth_password">Password</Label>
                <Input
                  id="auth_password"
                  type="password"
                  value={formData.auth_password}
                  onChange={(e) => setFormData({ ...formData, auth_password: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.auth_type === 'api_key' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auth_header_name">Header Name</Label>
                <Input
                  id="auth_header_name"
                  placeholder="X-API-Key"
                  value={formData.auth_header_name}
                  onChange={(e) => setFormData({ ...formData, auth_header_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="auth_api_key">API Key</Label>
                <Input
                  id="auth_api_key"
                  type="password"
                  placeholder="your-api-key"
                  value={formData.auth_api_key}
                  onChange={(e) => setFormData({ ...formData, auth_api_key: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Triggering Webhooks from Your App

### Example: Order Created Event

`src/services/orderService.ts`:
```typescript
import { supabase } from '@/lib/supabase'
import { callEdgeFunction } from '@/lib/api-client'

export async function createOrder(orderData: any) {
  // Create order in database
  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) throw error

  // Trigger webhooks
  try {
    await callEdgeFunction('webhook-deliver', {
      dealer_id: order.dealer_id,
      event_type: 'order.created',
      payload: {
        order_id: order.id,
        customer_name: order.customer_name,
        vehicle_vin: order.vehicle_vin,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
      },
    })
  } catch (error) {
    // Don't fail order creation if webhook delivery fails
    console.error('Webhook delivery failed:', error)
  }

  return order
}
```

---

## Error Handling

### Global Error Handler

`src/lib/error-handler.ts`:
```typescript
import { useToast } from '@/components/ui/use-toast'

export function useAPIErrorHandler() {
  const { toast } = useToast()

  return function handleAPIError(error: any, defaultMessage: string = 'An error occurred') {
    let title = 'Error'
    let message = defaultMessage

    if (error?.error?.code) {
      switch (error.error.code) {
        case 'UNAUTHORIZED':
          title = 'Authentication Required'
          message = 'Please log in to continue'
          break
        case 'FORBIDDEN':
          title = 'Access Denied'
          message = 'You do not have permission to perform this action'
          break
        case 'VALIDATION_ERROR':
          title = 'Validation Error'
          message = error.error.message
          break
        case 'RATE_LIMIT_EXCEEDED':
          title = 'Rate Limit Exceeded'
          message = `Too many requests. Please try again in ${error.error.details?.retry_after || 60} seconds`
          break
        case 'SLACK_API_ERROR':
          title = 'Slack Error'
          message = error.error.message
          break
        default:
          title = 'Error'
          message = error.error.message || defaultMessage
      }
    }

    toast({
      title,
      description: message,
      variant: 'destructive',
    })
  }
}
```

### Usage Example

```typescript
import { useAPIErrorHandler } from '@/lib/error-handler'

function MyComponent() {
  const handleError = useAPIErrorHandler()

  async function sendMessage() {
    try {
      const response = await callEdgeFunction('slack-send-message', { ... })
      if (!response.success) {
        handleError(response, 'Failed to send message')
        return
      }
      // Success handling
    } catch (error) {
      handleError(error, 'Unexpected error occurred')
    }
  }
}
```

---

**End of Frontend Examples**
