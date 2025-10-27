# Settings Hub - Quick Start Guide
## Implementación en 7 Días

---

## Día 1: Configuración de Base de Datos

### 1.1 Aplicar Migraciones

```bash
cd /c/Users/rudyr/apps/mydetailarea

# Conectar a Supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migración de tablas
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase/migrations/20251025_settings_hub_integrations.sql

# Aplicar configuración de encriptación
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase/migrations/20251025_setup_vault_encryption.sql
```

### 1.2 Verificar Instalación

```sql
-- Verificar que todas las tablas fueron creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'dealer_integrations',
    'webhook_deliveries',
    'notification_templates',
    'audit_logs',
    'oauth_states',
    'rate_limit_log'
  );

-- Verificar encriptación
SELECT * FROM integration_encryption_status;

-- Debería devolver: settings-encryption-key
SELECT name FROM vault.secrets WHERE name = 'settings-encryption-key';
```

### 1.3 Crear Índices Adicionales (Opcional)

```sql
-- Para mejor performance en producción
CREATE INDEX CONCURRENTLY idx_webhook_deliveries_created_dealer
  ON webhook_deliveries(dealer_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_dealer_created
  ON audit_logs(dealer_id, created_at DESC);
```

---

## Día 2: Configuración de Slack App

### 2.1 Crear Slack App

1. Ve a https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Nombre: **MyDetailArea Integration**
4. Selecciona workspace de desarrollo

### 2.2 Configurar OAuth & Permissions

**Redirect URLs**:
```
https://YOUR_APP_DOMAIN.com/api/slack/callback
http://localhost:3000/api/slack/callback (para desarrollo)
```

**Bot Token Scopes**:
- `chat:write` - Enviar mensajes
- `channels:read` - Listar canales públicos
- `groups:read` - Listar canales privados (opcional)
- `im:write` - Enviar mensajes directos (opcional)

### 2.3 Obtener Credenciales

```bash
# En Slack App Settings > Basic Information

SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=abc123def456
```

### 2.4 Configurar Variables de Entorno

```bash
# En Supabase Dashboard > Project Settings > Edge Functions

supabase secrets set SLACK_CLIENT_ID="123456789.123456789"
supabase secrets set SLACK_CLIENT_SECRET="abc123def456"
supabase secrets set SLACK_REDIRECT_URI="https://your-app.com/api/slack/callback"
supabase secrets set APP_URL="https://your-app.com"
```

---

## Día 3: Desplegar Edge Functions

### 3.1 Verificar Estructura

```bash
ls -la supabase/functions/

# Deberías ver:
# - slack-oauth-callback/
# - slack-send-message/
# - slack-test-connection/
# - slack-list-channels/
# - webhook-deliver/
# - webhook-test/
# - notification-render-template/
# - audit-log-create/
```

### 3.2 Desplegar Funciones

```bash
# Desplegar todas las funciones Slack
supabase functions deploy slack-oauth-callback --no-verify-jwt
supabase functions deploy slack-send-message
supabase functions deploy slack-test-connection
supabase functions deploy slack-list-channels

# Desplegar funciones de webhooks
supabase functions deploy webhook-deliver
supabase functions deploy webhook-test

# Desplegar funciones de notificaciones
supabase functions deploy notification-render-template

# Desplegar función de audit
supabase functions deploy audit-log-create
```

**Nota**: `slack-oauth-callback` usa `--no-verify-jwt` porque Slack llama a este endpoint sin autenticación.

### 3.3 Verificar Despliegue

```bash
# Listar funciones desplegadas
supabase functions list

# Probar una función localmente
supabase functions serve slack-test-connection --env-file .env.local

# En otra terminal
curl -X POST http://localhost:54321/functions/v1/slack-test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dealer_id": 1, "bot_token": "xoxb-test"}'
```

---

## Día 4: Frontend - Integración Slack

### 4.1 Crear Página de Settings

Ubicación: `src/pages/Settings/IntegrationsTab.tsx`

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export function IntegrationsTab() {
  const [loading, setLoading] = useState(false)
  const [slackIntegration, setSlackIntegration] = useState(null)

  // Fetch existing integration
  useEffect(() => {
    fetchSlackIntegration()
  }, [])

  async function fetchSlackIntegration() {
    const { data: userData } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('dealer_id')
      .eq('id', userData.user.id)
      .single()

    const { data } = await supabase
      .from('dealer_integrations')
      .select('*')
      .eq('dealer_id', userProfile.dealer_id)
      .eq('integration_type', 'slack')
      .single()

    setSlackIntegration(data)
  }

  async function handleConnectSlack() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('dealer_id')
      .eq('id', userData.user.id)
      .single()

    // Create OAuth state
    const state = btoa(JSON.stringify({
      dealer_id: userProfile.dealer_id,
      user_id: userData.user.id,
      timestamp: Date.now(),
    }))

    await supabase.from('oauth_states').insert({
      state_token: state,
      dealer_id: userProfile.dealer_id,
      user_id: userData.user.id,
      integration_type: 'slack',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    })

    // Redirect to Slack OAuth
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/slack/callback`
    const scopes = 'chat:write,channels:read,groups:read'

    const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`

    window.location.href = slackOAuthUrl
  }

  async function handleTestConnection() {
    setLoading(true)

    const { data, error } = await supabase.functions.invoke('slack-test-connection', {
      body: {
        dealer_id: slackIntegration.dealer_id,
        integration_id: slackIntegration.id,
      },
    })

    if (error) {
      toast.error('Connection test failed')
    } else {
      toast.success(`Connected to ${data.data.workspace_name}`)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            Connect your Slack workspace to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slackIntegration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{slackIntegration.config.team_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(slackIntegration.created_at).toLocaleDateString()}
                  </p>
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
                    variant="destructive"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnectSlack} disabled={loading}>
              Connect Slack Workspace
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4.2 Agregar Variables de Entorno

`.env.local`:
```bash
VITE_SLACK_CLIENT_ID=123456789.123456789
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Día 5: Webhooks & Notificaciones

### 5.1 Crear UI para Webhooks

`src/pages/Settings/WebhooksTab.tsx`:

```typescript
export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  async function handleCreateWebhook(data) {
    const { data: userData } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('dealer_id')
      .eq('id', userData.user.id)
      .single()

    await supabase.from('dealer_integrations').insert({
      dealer_id: userProfile.dealer_id,
      integration_type: 'webhook',
      integration_name: data.name,
      config: {
        url: data.url,
        events: data.events,
        headers: data.headers,
        auth_type: data.auth_type,
        auth_config: data.auth_config,
      },
      enabled: true,
      created_by: userData.user.id,
    })

    toast.success('Webhook created successfully')
    fetchWebhooks()
  }

  async function handleTestWebhook(webhookId) {
    const { data, error } = await supabase.functions.invoke('webhook-test', {
      body: {
        url: webhook.config.url,
        headers: webhook.config.headers,
        auth_type: webhook.config.auth_type,
        auth_config: webhook.config.auth_config,
      },
    })

    if (error) {
      toast.error('Test failed')
    } else {
      toast.success(`Test passed (${data.data.response_time_ms}ms)`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2>Webhooks</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          Add Webhook
        </Button>
      </div>

      <div className="grid gap-4">
        {webhooks.map(webhook => (
          <WebhookCard
            key={webhook.id}
            webhook={webhook}
            onTest={handleTestWebhook}
            onDelete={handleDeleteWebhook}
          />
        ))}
      </div>

      <CreateWebhookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWebhook}
      />
    </div>
  )
}
```

### 5.2 Event Triggers (Backend)

En tu aplicación, cuando ocurre un evento, llama a `webhook-deliver`:

```typescript
// Ejemplo: Cuando se crea una orden
async function onOrderCreated(order) {
  // ... lógica de creación de orden

  // Trigger webhooks
  await supabase.functions.invoke('webhook-deliver', {
    body: {
      dealer_id: order.dealer_id,
      event_type: 'order.created',
      payload: {
        order_id: order.id,
        customer_name: order.customer_name,
        vehicle_vin: order.vehicle_vin,
        status: order.status,
        created_at: order.created_at,
      },
    },
  })
}
```

---

## Día 6: Testing

### 6.1 Test Slack Integration

```bash
# 1. Conectar workspace desde UI
# 2. Probar envío de mensaje

curl -X POST https://your-project.supabase.co/functions/v1/slack-send-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealer_id": 1,
    "channel": "#test",
    "text": "Test message from MyDetailArea"
  }'
```

### 6.2 Test Webhooks

```bash
# 1. Crear webhook apuntando a https://webhook.site
# 2. Trigger evento

curl -X POST https://your-project.supabase.co/functions/v1/webhook-deliver \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealer_id": 1,
    "event_type": "order.created",
    "payload": {
      "order_id": "12345",
      "customer_name": "John Doe"
    }
  }'

# 3. Verificar en webhook.site que recibió el payload
```

### 6.3 Test Rate Limiting

```bash
# Enviar 101 requests en 60 segundos
for i in {1..101}; do
  curl -X POST https://your-project.supabase.co/functions/v1/slack-send-message \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"dealer_id": 1, "channel": "#test", "text": "Test '$i'"}' &
done

# La request 101 debería retornar 429 Rate Limit Exceeded
```

### 6.4 Test Encryption

```sql
-- Verificar que los tokens están encriptados
SELECT
  id,
  integration_type,
  credentials_encrypted,
  LENGTH(oauth_access_token) as token_length,
  LEFT(oauth_access_token, 20) as token_preview
FROM dealer_integrations
WHERE oauth_access_token IS NOT NULL;

-- Los tokens encriptados deberían ser mucho más largos y verse como gibberish
```

---

## Día 7: Producción

### 7.1 Checklist Pre-Deploy

- [ ] Todas las migraciones aplicadas
- [ ] Edge Functions desplegadas
- [ ] Variables de entorno configuradas
- [ ] Slack App aprobada para distribución
- [ ] Rate limits configurados
- [ ] Monitoring configurado
- [ ] Audit logs funcionando
- [ ] Encryption habilitada
- [ ] RLS policies activas
- [ ] Backup de base de datos

### 7.2 Monitoring Setup

```sql
-- Query para dashboard de Grafana/Datadog

-- Mensajes Slack enviados por día
SELECT
  DATE(created_at) as date,
  COUNT(*) as messages_sent
FROM audit_logs
WHERE event_type = 'integration.slack.message_sent'
GROUP BY date
ORDER BY date DESC
LIMIT 30;

-- Webhook delivery success rate
SELECT
  event_type,
  COUNT(*) FILTER (WHERE status = 'delivered') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
    COUNT(*)::numeric * 100, 2
  ) as success_rate
FROM webhook_deliveries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Rate limit hits
SELECT
  endpoint,
  COUNT(*) as requests,
  COUNT(DISTINCT rate_key) as unique_users
FROM rate_limit_log
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::bigint
GROUP BY endpoint
ORDER BY requests DESC;
```

### 7.3 Alertas

Configurar en tu sistema de monitoring:

```yaml
alerts:
  - name: High Slack API Error Rate
    condition: slack_api_errors > 10 in 5m
    severity: warning
    action: notify_team

  - name: Webhook Delivery Failures
    condition: webhook_failed_rate > 20% in 15m
    severity: warning
    action: notify_team

  - name: Rate Limit Abuse
    condition: rate_limit_hits > 100 from same_user in 5m
    severity: critical
    action: block_user

  - name: Database Encryption Disabled
    condition: unencrypted_tokens > 0
    severity: critical
    action: page_security_team
```

---

## Troubleshooting

### Error: "Encryption key not found"

```sql
-- Verificar que la clave existe
SELECT name FROM vault.secrets WHERE name = 'settings-encryption-key';

-- Si no existe, crearla
SELECT vault.create_secret(
  gen_random_bytes(32)::text,
  'settings-encryption-key',
  'Encryption key for Settings Hub'
);
```

### Error: "Slack OAuth callback failed"

1. Verificar redirect URI en Slack App matches exactamente
2. Verificar que `slack-oauth-callback` está desplegado con `--no-verify-jwt`
3. Verificar variables de entorno `SLACK_CLIENT_ID` y `SLACK_CLIENT_SECRET`

### Error: "RLS policy prevents access"

```sql
-- Verificar que el usuario tiene acceso al dealer
SELECT
  u.id,
  u.email,
  u.dealer_id,
  d.name as dealer_name
FROM users u
LEFT JOIN dealerships d ON d.id = u.dealer_id
WHERE u.id = 'USER_UUID_HERE';

-- Verificar memberships
SELECT * FROM dealer_memberships WHERE user_id = 'USER_UUID_HERE';
```

---

## Recursos Adicionales

- **Documentación Completa**: `SETTINGS_HUB_API_ARCHITECTURE.md`
- **Slack API Docs**: https://api.slack.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase Vault**: https://supabase.com/docs/guides/database/vault

---

## Soporte

Para issues o preguntas:
1. Revisar logs en Supabase Dashboard > Edge Functions > Logs
2. Revisar audit logs en la tabla `audit_logs`
3. Verificar status de integraciones en `integration_encryption_status` view

**Fin del Quick Start Guide**
