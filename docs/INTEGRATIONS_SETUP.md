# OAuth & Integrations Setup Guide

## Overview

This guide walks through setting up the enterprise-grade OAuth and integration system for MyDetailArea. The system includes:

- **Slack OAuth 2.0 Integration** - Real-time notifications
- **Webhook Management** - Send data to external systems
- **API Key Management** - Secure external API access
- **Credential Encryption** - AES-256-GCM encryption
- **Rate Limiting** - API abuse prevention
- **Audit Logging** - Complete security trail
- **Row Level Security** - Dealer-scoped data isolation

## Prerequisites

- Supabase project with service role access
- Node.js 18+ for local development
- Slack workspace (for Slack integration)
- PostgreSQL client (optional, for manual queries)

## Step 1: Database Setup

### Run Migrations

Apply the integration security system migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Open supabase/migrations/20250125000001_create_integrations_system.sql
# 3. Run the migration
```

### Verify Tables Created

Check that the following tables exist:

- `dealer_integrations` - Integration configurations
- `api_rate_limits` - Rate limiting data
- `security_audit_log` - Audit trail
- `oauth_states` - CSRF protection tokens
- `integration_webhook_logs` - Webhook delivery logs

```sql
-- Verify tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'dealer_integrations',
  'api_rate_limits',
  'security_audit_log',
  'oauth_states',
  'integration_webhook_logs'
);
```

## Step 2: Environment Variables

### Development (.env.local)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Slack OAuth (get from https://api.slack.com/apps)
VITE_SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=your-slack-client-secret

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# OAuth redirect URI (match your Slack app configuration)
VITE_OAUTH_REDIRECT_URI=http://localhost:8080/api/slack/callback
```

### Production (Supabase Secrets)

```bash
# Set secrets via Supabase CLI
supabase secrets set SLACK_CLIENT_SECRET=your-slack-client-secret
supabase secrets set ENCRYPTION_KEY=your-production-encryption-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Verify secrets
supabase secrets list
```

## Step 3: Slack App Configuration

### Create Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Enter app name: "MyDetailArea Notifications"
4. Select your workspace
5. Click **Create App**

### Configure OAuth & Permissions

1. In your app dashboard, go to **OAuth & Permissions**
2. Add **Redirect URLs**:
   - Development: `http://localhost:8080/api/slack/callback`
   - Production: `https://app.mydetailarea.com/api/slack/callback`

3. Add **Bot Token Scopes**:
   - `chat:write` - Send messages
   - `channels:read` - View channel list
   - `groups:read` - View private channel list
   - `im:write` - Send direct messages
   - `incoming-webhook` - Post to specific channels

4. **Install App to Workspace** (generates bot token)

### Get Credentials

After installing, you'll see:
- **Bot User OAuth Token**: `xoxb-...` (stored encrypted in database)
- **Client ID**: Copy to `VITE_SLACK_CLIENT_ID`
- **Client Secret**: Copy to `SLACK_CLIENT_SECRET`

## Step 4: Deploy Edge Functions

### Slack OAuth Callback Function

```bash
# Deploy the callback handler
supabase functions deploy slack-oauth-callback

# Test the deployment
supabase functions invoke slack-oauth-callback --method GET
```

### Verify Function Access

```bash
# Check function exists
supabase functions list

# View logs
supabase functions logs slack-oauth-callback
```

## Step 5: Frontend Integration

### Enable Integrations in Settings

The Slack integration card is already added to the Settings page under the **Integrations** tab.

```typescript
// Located at: src/components/settings/IntegrationSettings.tsx
<SlackIntegrationCard />
```

### Test OAuth Flow

1. Navigate to **Settings** → **Integrations** → **Slack** tab
2. Click **Connect to Slack**
3. Authorize the app in Slack
4. Verify redirect back to app with success message
5. Check integration appears in database:

```sql
SELECT * FROM dealer_integrations
WHERE integration_type = 'slack'
ORDER BY created_at DESC
LIMIT 1;
```

## Step 6: Security Verification

### Test CSRF Protection

1. Attempt OAuth with invalid state token:
```bash
curl "http://localhost:8080/api/slack/callback?code=test&state=invalid"
```

Expected: Redirect to error page with `invalid_state`

2. Verify audit log entry:
```sql
SELECT * FROM security_audit_log
WHERE event_type = 'OAUTH_INVALID_STATE'
ORDER BY created_at DESC
LIMIT 1;
```

### Test Rate Limiting

```sql
-- Check rate limit function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'check_rate_limit';

-- Test rate limit
SELECT check_rate_limit(1, 'slack_send');
```

### Test Encryption

```typescript
// Test in browser console
import { encryptAES, decryptAES } from '@/lib/crypto/encryption';

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const plaintext = 'xoxb-secret-token';

const encrypted = await encryptAES(plaintext, key);
console.log('Encrypted:', encrypted);

const decrypted = await decryptAES(encrypted, key);
console.log('Decrypted:', decrypted);
console.assert(decrypted === plaintext, 'Encryption roundtrip failed');
```

## Step 7: Monitoring & Maintenance

### View Audit Logs

```sql
-- Recent security events
SELECT
  event_type,
  severity,
  created_at,
  metadata->>'team_name' as slack_workspace
FROM security_audit_log
WHERE event_category = 'integrations'
ORDER BY created_at DESC
LIMIT 20;

-- Critical events only
SELECT * FROM security_audit_log
WHERE severity = 'critical'
AND created_at > NOW() - INTERVAL '7 days';
```

### Monitor Rate Limits

```sql
-- Current rate limit usage
SELECT
  d.name as dealership,
  r.endpoint,
  r.request_count,
  r.limit_per_window,
  r.window_end,
  ROUND(100.0 * r.request_count / r.limit_per_window, 2) as usage_percent
FROM api_rate_limits r
JOIN dealerships d ON r.dealer_id = d.id
WHERE r.window_end > NOW()
ORDER BY usage_percent DESC;
```

### Check Integration Health

```sql
-- Active integrations
SELECT
  d.name as dealership,
  di.integration_type,
  di.integration_name,
  di.status,
  di.enabled,
  di.last_sync_at,
  di.error_count
FROM dealer_integrations di
JOIN dealerships d ON di.dealer_id = d.id
WHERE di.enabled = true
ORDER BY di.updated_at DESC;

-- Failed integrations
SELECT * FROM dealer_integrations
WHERE status = 'error'
AND enabled = true;
```

## Step 8: Key Rotation

### Rotate Encryption Key

```bash
# 1. Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Update environment variable
supabase secrets set ENCRYPTION_KEY_NEW=new-key-here

# 3. Run migration script (to be created)
# This script re-encrypts all tokens with new key

# 4. Delete old key after grace period
supabase secrets unset ENCRYPTION_KEY_OLD
```

### Rotate Slack Client Secret

1. Go to Slack App Dashboard → **Basic Information**
2. Click **Rotate Secret** under Client Secret
3. Update environment variable immediately:
```bash
supabase secrets set SLACK_CLIENT_SECRET=new-secret-here
```

## Troubleshooting

### OAuth Callback Not Working

**Symptom**: Redirect to error page after Slack authorization

**Solutions**:
1. Verify redirect URI matches Slack app configuration exactly
2. Check Edge Function logs: `supabase functions logs slack-oauth-callback`
3. Verify `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set correctly
4. Check `oauth_states` table for expired or missing state tokens

### Tokens Not Decrypting

**Symptom**: "Failed to decrypt data" errors

**Solutions**:
1. Verify `ENCRYPTION_KEY` is 32 bytes (64 hex characters)
2. Ensure same key used for encryption and decryption
3. Check if key was rotated without re-encrypting data
4. Verify token format in database (should be base64)

### Rate Limits Not Working

**Symptom**: Users exceed API limits without being blocked

**Solutions**:
1. Verify `check_rate_limit()` function exists and works
2. Check `api_rate_limits` table has records
3. Ensure Edge Functions call rate limit check before API calls
4. Verify window expiration logic is correct

### Audit Logs Not Appearing

**Symptom**: No entries in `security_audit_log`

**Solutions**:
1. Verify trigger `audit_integration_changes_trigger` exists
2. Check RLS policies allow inserts from service role
3. Ensure Edge Functions have service role key
4. Manually insert test record to verify permissions

## Security Best Practices

### Do's ✅

- ✅ Always use HTTPS in production
- ✅ Rotate encryption keys quarterly
- ✅ Review audit logs weekly
- ✅ Keep Slack app permissions minimal (principle of least privilege)
- ✅ Set appropriate rate limits per endpoint
- ✅ Use different encryption keys for dev/staging/production
- ✅ Monitor for suspicious OAuth activity

### Don'ts ❌

- ❌ Never commit `.env` files with real credentials
- ❌ Never expose service role key to frontend
- ❌ Never log decrypted tokens
- ❌ Never disable RLS policies
- ❌ Never skip state validation in OAuth
- ❌ Never use weak encryption keys
- ❌ Never allow unlimited API requests

## Testing Checklist

Before deploying to production:

- [ ] OAuth flow completes successfully
- [ ] State token validation prevents CSRF
- [ ] Tokens are encrypted in database
- [ ] RLS policies prevent cross-dealer access
- [ ] Audit logs capture all security events
- [ ] Rate limits block excessive requests
- [ ] Webhook signatures verify correctly
- [ ] Error handling works for all failure modes
- [ ] Integration can be enabled/disabled
- [ ] Integration can be disconnected
- [ ] Translations work in all 3 languages (EN, ES, PT-BR)
- [ ] Mobile UI is responsive

## Support

For issues or questions:
- Documentation: `docs/OAUTH_SECURITY.md`
- Security concerns: Report via responsible disclosure
- Supabase issues: Check `supabase status`
- Edge Function logs: `supabase functions logs`

## Next Steps

After completing setup:

1. **Add Webhook Integration** - Allow external systems to receive events
2. **Implement API Key Management** - Generate API keys for external access
3. **Add More OAuth Providers** - Google, GitHub, Microsoft integrations
4. **Enhanced Monitoring** - Slack alerts for security events
5. **Automated Testing** - Playwright E2E tests for OAuth flow

## Related Documentation

- [OAuth Security Documentation](./OAUTH_SECURITY.md)
- [Database Schema](./database-schema.md)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Slack API Documentation](https://api.slack.com/docs)
