# Settings Hub Integration Layer
## MyDetailArea - Enterprise Integration Architecture

**Version**: 1.0.0
**Date**: October 25, 2025
**Status**: Production-Ready ✅

---

## Quick Links

| Document | Description | Pages |
|----------|-------------|-------|
| [📐 Architecture](./SETTINGS_HUB_API_ARCHITECTURE.md) | Complete API architecture & design | 85+ |
| [🚀 Quick Start](./SETTINGS_HUB_QUICK_START.md) | 7-day implementation guide | 20 |
| [💻 Edge Functions Code](./SETTINGS_HUB_EDGE_FUNCTIONS_CODE.md) | TypeScript implementation | 35 |
| [🎨 Frontend Examples](./SETTINGS_HUB_FRONTEND_EXAMPLES.md) | React integration examples | 25 |
| [📋 Summary](./SETTINGS_HUB_IMPLEMENTATION_SUMMARY.md) | Executive summary | 15 |

---

## What is Settings Hub?

El **Settings Hub** es la capa de integración empresarial de MyDetailArea que permite a los concesionarios conectar sus sistemas externos (Slack, webhooks personalizados, notificaciones) con la plataforma.

### Features

- ✅ **Slack Integration**: OAuth 2.0, envío de mensajes, gestión de canales
- ✅ **Generic Webhooks**: Sistema de delivery con retry logic automático
- ✅ **Notification Templates**: Multi-canal (email, SMS, Slack, push)
- ✅ **Audit Logging**: Registro completo para compliance
- ✅ **Encryption**: Todos los tokens encriptados con Supabase Vault
- ✅ **Rate Limiting**: Protección contra abuso
- ✅ **Multi-Dealership**: Soporte nativo para múltiples concesionarios

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│           Frontend (React + TS)               │
│         Settings Hub Interface                │
└────────────────┬─────────────────────────────┘
                 │ HTTPS + JWT
                 ▼
┌──────────────────────────────────────────────┐
│      Supabase Edge Functions (Deno)          │
├──────────────────────────────────────────────┤
│  • slack-oauth-callback                      │
│  • slack-send-message                        │
│  • slack-test-connection                     │
│  • slack-list-channels                       │
│  • webhook-deliver                           │
│  • webhook-test                              │
│  • notification-render-template              │
│  • audit-log-create                          │
└────────────────┬─────────────────────────────┘
                 │ RLS + Encryption
                 ▼
┌──────────────────────────────────────────────┐
│      PostgreSQL + Supabase Vault             │
├──────────────────────────────────────────────┤
│  Tables:                                     │
│  • dealer_integrations                       │
│  • webhook_deliveries                        │
│  • notification_templates                    │
│  • audit_logs                                │
│  • oauth_states                              │
│  • rate_limit_log                            │
└──────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Apply Database Migrations

```bash
cd /c/Users/rudyr/apps/mydetailarea

# Apply integrations tables
psql -h YOUR_DB_HOST -U postgres -d postgres \
  -f supabase/migrations/20251025_settings_hub_integrations.sql

# Setup encryption
psql -h YOUR_DB_HOST -U postgres -d postgres \
  -f supabase/migrations/20251025_setup_vault_encryption.sql
```

### 2. Deploy Edge Functions

```bash
# Login to Supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
./scripts/deploy-settings-hub.sh
```

### 3. Configure Secrets

```bash
supabase secrets set SLACK_CLIENT_ID="123456789.123456789"
supabase secrets set SLACK_CLIENT_SECRET="your-secret"
supabase secrets set SLACK_REDIRECT_URI="https://your-app.com/api/slack/callback"
supabase secrets set APP_URL="https://your-app.com"
```

### 4. Setup Slack App

1. Go to https://api.slack.com/apps
2. Create new app "MyDetailArea Integration"
3. Configure OAuth redirect: `https://your-app.com/api/slack/callback`
4. Add scopes: `chat:write`, `channels:read`, `groups:read`
5. Copy Client ID and Secret

### 5. Test

```bash
# Test locally
supabase functions serve slack-test-connection --env-file .env.local

# Call function
curl -X POST http://localhost:54321/functions/v1/slack-test-connection \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"dealer_id": 1, "bot_token": "xoxb-test"}'
```

---

## File Structure

```
mydetailarea/
├── docs/
│   ├── SETTINGS_HUB_API_ARCHITECTURE.md
│   ├── SETTINGS_HUB_QUICK_START.md
│   ├── SETTINGS_HUB_EDGE_FUNCTIONS_CODE.md
│   ├── SETTINGS_HUB_FRONTEND_EXAMPLES.md
│   └── SETTINGS_HUB_IMPLEMENTATION_SUMMARY.md
│
├── supabase/
│   ├── migrations/
│   │   ├── 20251025_settings_hub_integrations.sql
│   │   └── 20251025_setup_vault_encryption.sql
│   │
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── types.ts
│       │   ├── errors.ts
│       │   ├── auth.ts
│       │   ├── encryption.ts
│       │   └── rate-limit.ts
│       │
│       ├── slack-oauth-callback/
│       │   └── index.ts
│       ├── slack-send-message/
│       │   └── index.ts
│       ├── slack-test-connection/
│       │   └── index.ts
│       ├── slack-list-channels/
│       │   └── index.ts
│       ├── webhook-deliver/
│       │   └── index.ts
│       ├── webhook-test/
│       │   └── index.ts
│       ├── notification-render-template/
│       │   └── index.ts
│       └── audit-log-create/
│           └── index.ts
│
└── scripts/
    └── deploy-settings-hub.sh
```

---

## Database Tables

### dealer_integrations
Stores all external integrations (Slack, webhooks) per dealership.

**Key Fields**:
- `integration_type`: 'slack', 'webhook', etc.
- `oauth_access_token`: Encrypted bot token
- `config`: JSONB with integration-specific settings
- `enabled`: Boolean to enable/disable

### webhook_deliveries
Tracks webhook delivery attempts with retry queue.

**Key Fields**:
- `event_type`: Type of event (order.created, etc.)
- `payload`: Event data
- `delivery_attempts`: Retry counter
- `status`: 'pending', 'delivered', 'failed'
- `next_retry_at`: When to retry

### notification_templates
Multi-channel notification templates.

**Key Fields**:
- `channel`: 'email', 'sms', 'slack', 'push'
- `body`: Template with {{variables}}
- `variables`: List of available variables
- `slack_blocks`: Rich Slack formatting

### audit_logs
Security and compliance logging.

**Key Fields**:
- `event_type`: Type of event logged
- `severity`: 'info', 'warning', 'error', 'critical'
- `metadata`: Additional event data
- `ip_address`, `user_agent`: Request context

---

## API Reference

### Slack APIs

#### POST /slack-send-message
Send message to Slack channel.

**Request**:
```json
{
  "dealer_id": 1,
  "channel": "#general",
  "text": "Hello from MyDetailArea!"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message_ts": "1234567890.123456",
    "channel": "C1234567890"
  }
}
```

#### POST /slack-test-connection
Test Slack integration.

**Request**:
```json
{
  "dealer_id": 1,
  "integration_id": "uuid-here"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "workspace_name": "My Workspace",
    "channel_count": 15,
    "connection_status": "ok"
  }
}
```

### Webhook APIs

#### POST /webhook-deliver
Deliver event to webhooks.

**Request**:
```json
{
  "dealer_id": 1,
  "event_type": "order.created",
  "payload": {
    "order_id": "12345",
    "customer_name": "John Doe"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "delivered_count": 2,
    "failed_count": 0
  }
}
```

#### POST /webhook-test
Test webhook endpoint.

**Request**:
```json
{
  "url": "https://api.example.com/webhooks",
  "auth_type": "bearer",
  "auth_config": {
    "token": "secret-token"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status_code": 200,
    "response_time_ms": 145,
    "connection_test": "passed"
  }
}
```

---

## Security

### Authentication
All endpoints (except OAuth callback) require JWT authentication.

```typescript
const { data, error } = await supabase.functions.invoke('slack-send-message', {
  body: { ... }
})
```

### Encryption
All OAuth tokens encrypted using Supabase Vault (AES-256-GCM).

```sql
-- Encrypt
SELECT encrypt_secret('my-token', 'settings-encryption-key');

-- Decrypt
SELECT decrypt_secret('encrypted-value', 'settings-encryption-key');
```

### Rate Limiting
Automatic rate limiting per dealer:

| Endpoint | Limit | Window |
|----------|-------|--------|
| slack-send-message | 100 req | 60 sec |
| webhook-deliver | 500 req | 60 sec |
| Default | 60 req | 60 sec |

### CSRF Protection
OAuth flows protected with state tokens:

1. Generate state token
2. Store in `oauth_states` table
3. Verify on callback
4. Mark as used (one-time)

---

## Monitoring

### Key Metrics

**Dashboard Queries**:

```sql
-- Slack messages sent today
SELECT COUNT(*) FROM audit_logs
WHERE event_type = 'integration.slack.message_sent'
  AND created_at > CURRENT_DATE;

-- Webhook delivery success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'delivered') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
    COUNT(*)::numeric * 100, 2
  ) as success_rate
FROM webhook_deliveries
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Rate limit hits
SELECT endpoint, COUNT(*) as requests
FROM rate_limit_log
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::bigint
GROUP BY endpoint;
```

### Alerts

Configure alerts for:
- Error rate > 5%
- Webhook failures > 20%
- Rate limit abuse
- Integration credentials invalid

---

## Troubleshooting

### "Encryption key not found"

```sql
-- Check if key exists
SELECT name FROM vault.secrets WHERE name = 'settings-encryption-key';

-- If not, create it
SELECT vault.create_secret(
  gen_random_bytes(32)::text,
  'settings-encryption-key',
  'Encryption key for Settings Hub'
);
```

### "Slack OAuth failed"

1. Check redirect URI in Slack App matches exactly
2. Verify `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` secrets
3. Ensure `slack-oauth-callback` deployed with `--no-verify-jwt`

### "Webhook delivery failed"

1. Check webhook URL is accessible
2. Verify authentication credentials
3. Check customer endpoint logs
4. Review `webhook_deliveries` table for error details

---

## Support

### Documentation
- 📐 [Full Architecture](./SETTINGS_HUB_API_ARCHITECTURE.md)
- 🚀 [Quick Start Guide](./SETTINGS_HUB_QUICK_START.md)
- 💻 [Edge Functions Code](./SETTINGS_HUB_EDGE_FUNCTIONS_CODE.md)
- 🎨 [Frontend Examples](./SETTINGS_HUB_FRONTEND_EXAMPLES.md)

### External Resources
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Slack API Docs](https://api.slack.com/)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

### Debugging
1. Check Edge Function logs in Supabase Dashboard
2. Query `audit_logs` for event history
3. Verify encryption status: `SELECT * FROM integration_encryption_status`
4. Test locally: `supabase functions serve <function-name>`

---

## Contributing

### Adding New Integration

1. Create migration for new integration type
2. Add Edge Function in `supabase/functions/`
3. Update `dealer_integrations` config schema
4. Add frontend UI components
5. Write tests
6. Update documentation

### Testing

```bash
# Unit tests
deno test supabase/functions/slack-send-message/index.test.ts

# Integration tests
npm run test:integration

# Load tests
k6 run tests/load/slack-send-message.js
```

---

## License

Proprietary - MyDetailArea © 2025

---

## Changelog

### v1.0.0 (2025-10-25)
- ✅ Initial architecture design
- ✅ Database schema (6 tables)
- ✅ Edge Functions (8 functions)
- ✅ Slack integration (OAuth + messaging)
- ✅ Generic webhooks system
- ✅ Notification templates
- ✅ Audit logging
- ✅ Encryption (Supabase Vault)
- ✅ Rate limiting
- ✅ Complete documentation

---

**Built by**: API Architecture Specialist
**Date**: October 25, 2025
**Status**: Production-Ready ✅
