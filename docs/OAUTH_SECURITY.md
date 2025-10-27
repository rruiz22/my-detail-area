# OAuth & Integration Security Documentation

## Overview

This document outlines the enterprise-grade security implementation for OAuth flows and credential management in the MyDetailArea platform.

## Architecture Overview

### Security Layers

1. **Database Layer** - RLS policies, encrypted storage, audit logging
2. **Application Layer** - Token encryption, state validation, rate limiting
3. **Transport Layer** - HTTPS, security headers, CORS policies
4. **Monitoring Layer** - Audit logs, security events, anomaly detection

## OAuth 2.0 Flow (Slack Example)

### 1. Initiation Phase

**Frontend** (`SlackIntegrationCard.tsx`)
```typescript
// User clicks "Connect to Slack"
const stateToken = generateOAuthState(dealerId, userId);

// Store state in database (CSRF protection)
await supabase.from('oauth_states').insert({
  state_token: stateToken,
  dealer_id: dealerId,
  user_id: userId,
  integration_type: 'slack',
  expires_at: NOW() + 10 minutes
});

// Redirect to Slack OAuth
window.location.href = `https://slack.com/oauth/v2/authorize?
  client_id=${SLACK_CLIENT_ID}&
  scope=chat:write,channels:read&
  redirect_uri=${CALLBACK_URL}&
  state=${stateToken}`;
```

**Security Features:**
- ✅ Cryptographically secure state token (32+ bytes)
- ✅ State stored in database with 10-minute expiration
- ✅ State includes dealer_id, user_id, timestamp for validation
- ✅ Single-use state token (marked as used after validation)

### 2. Callback Phase

**Edge Function** (`slack-oauth-callback/index.ts`)
```typescript
// Validate state token (CSRF protection)
const stateData = validateOAuthState(state);
if (!stateData || stateData.timestamp > 10 minutes old) {
  return error('Invalid or expired state');
}

// Verify state in database
const dbState = await supabase
  .from('oauth_states')
  .select()
  .eq('state_token', state)
  .is('used_at', null)
  .single();

if (!dbState) {
  logSecurityEvent('OAUTH_INVALID_STATE', 'error');
  return error('Invalid state');
}

// Mark state as used (prevent replay attacks)
await supabase
  .from('oauth_states')
  .update({ used_at: NOW() })
  .eq('id', dbState.id);

// Exchange code for access token
const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
  method: 'POST',
  body: {
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code: authorizationCode,
    redirect_uri: CALLBACK_URL
  }
});

// Store encrypted token
await storeEncryptedToken(tokenResponse.access_token);
```

**Security Features:**
- ✅ State validation (timestamp, format, database lookup)
- ✅ Replay attack prevention (single-use tokens)
- ✅ Audit logging of all OAuth events
- ✅ Secure token exchange over HTTPS
- ✅ Client secret never exposed to frontend

### 3. Token Storage

**Encryption Strategy**

```typescript
// Application-level encryption (AES-256-GCM)
const encryptedToken = await encryptAES(
  accessToken,
  process.env.ENCRYPTION_KEY // 32-byte key
);

await supabase
  .from('dealer_integrations')
  .insert({
    dealer_id: dealerId,
    oauth_access_token: encryptedToken,
    credentials_encrypted: true
  });
```

**Alternative: Supabase Vault** (Recommended for Production)
```sql
-- Store in Vault
SELECT vault.create_secret(
  'slack_token_dealer_123',
  'xoxb-...'
);

-- Retrieve in Edge Function (service role only)
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'slack_token_dealer_123';
```

**Security Features:**
- ✅ AES-256-GCM encryption
- ✅ Unique encryption key per environment
- ✅ Tokens never logged or exposed in API responses
- ✅ Automatic key rotation support
- ✅ Vault integration for maximum security

## Row Level Security Policies

### dealer_integrations Table

```sql
-- Only dealer admins can view integrations
CREATE POLICY "Dealer admins can view own integrations"
ON dealer_integrations FOR SELECT
USING (
  dealer_id IN (
    SELECT dealership_id
    FROM dealer_memberships
    WHERE profile_id = auth.uid()
  )
  AND auth.uid() IN (
    SELECT id FROM profiles
    WHERE user_type IN ('system_admin', 'dealer_admin')
  )
);

-- Only dealer admins can create integrations
CREATE POLICY "Dealer admins can create integrations"
ON dealer_integrations FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE user_type IN ('system_admin', 'dealer_admin')
  )
);
```

**Principle of Least Privilege:**
- Only dealer_admin and system_admin can manage integrations
- Users can only access their own dealership's integrations
- Service role required for token decryption

## Audit Logging

### Security Events Tracked

```sql
-- All integration changes logged automatically
CREATE TRIGGER audit_integration_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON dealer_integrations
FOR EACH ROW EXECUTE FUNCTION audit_integration_changes();
```

**Logged Events:**
- `OAUTH_INITIATED` - User starts OAuth flow
- `OAUTH_STATE_EXPIRED` - State token expired (potential attack)
- `OAUTH_INVALID_STATE` - Invalid state token (CSRF attempt)
- `OAUTH_TOKEN_EXCHANGE_FAILED` - Token exchange error
- `SLACK_OAUTH_SUCCESS` - Successful connection
- `INSERT_INTEGRATION` - Integration created
- `UPDATE_INTEGRATION` - Integration modified
- `DELETE_INTEGRATION` - Integration deleted

**Audit Log Retention:**
- 90-day automatic expiration
- Queryable by severity (info, warning, error, critical)
- Includes IP address, user agent, metadata

## Rate Limiting

### API Protection

```sql
-- Check rate limit before API call
SELECT check_rate_limit(dealer_id, 'slack_send');

-- Configuration
CREATE TABLE api_rate_limits (
  dealer_id BIGINT,
  endpoint TEXT,
  limit_per_window INT DEFAULT 100,
  window_minutes INT DEFAULT 60,
  request_count INT DEFAULT 0
);
```

**Rate Limit Configuration:**
- Slack notifications: 100 requests/hour
- Webhook deliveries: 500 requests/hour
- SMS sending: 50 requests/hour
- Email sending: 200 requests/hour

**Exceeded Limit Response:**
```json
{
  "error": "rate_limit_exceeded",
  "retry_after": 3600,
  "limit": 100,
  "remaining": 0
}
```

## Webhook Security

### Signature Verification

```typescript
// Generate signature (sender)
const signature = await generateWebhookSignature(
  JSON.stringify(payload),
  webhookSecret
);

// Verify signature (receiver)
const isValid = await verifyWebhookSignature(
  payload,
  receivedSignature,
  webhookSecret
);

if (!isValid) {
  logSecurityEvent('WEBHOOK_INVALID_SIGNATURE', 'error');
  return 401;
}
```

**Security Features:**
- ✅ HMAC-SHA256 signature
- ✅ Constant-time comparison (timing attack prevention)
- ✅ Unique secret per webhook
- ✅ Signature included in X-Webhook-Signature header

## Threat Model & Mitigations

### 1. CSRF Attacks
**Threat:** Attacker tricks user into authorizing malicious app
**Mitigation:**
- State parameter with timestamp validation
- Database-backed state verification
- Single-use state tokens
- 10-minute expiration

### 2. Token Theft
**Threat:** Attacker gains access to OAuth tokens
**Mitigation:**
- AES-256-GCM encryption at rest
- Supabase Vault for production
- Tokens never in logs or API responses
- RLS policies restrict access

### 3. Replay Attacks
**Threat:** Attacker reuses captured OAuth callback
**Mitigation:**
- State tokens marked as used after validation
- Timestamp validation
- Database state tracking

### 4. Privilege Escalation
**Threat:** User gains unauthorized access to integrations
**Mitigation:**
- Role-based RLS policies
- Dealer-scoped data isolation
- Admin-only integration management
- Audit logging of all access

### 5. Man-in-the-Middle
**Threat:** Attacker intercepts OAuth flow
**Mitigation:**
- HTTPS only (enforced)
- Security headers (HSTS, CSP)
- Certificate pinning (recommended)
- Redirect URI validation

### 6. Timing Attacks
**Threat:** Attacker uses timing differences to extract secrets
**Mitigation:**
- Constant-time signature comparison
- No timing-dependent validation
- Rate limiting to prevent brute force

## Security Headers

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
```

## Encryption Key Management

### Development
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Store in .env.local
VITE_ENCRYPTION_KEY=abc123...
```

### Production
```bash
# Use Supabase environment variables (never commit!)
supabase secrets set ENCRYPTION_KEY=abc123...

# Rotate keys quarterly
# 1. Generate new key
# 2. Re-encrypt all tokens with new key
# 3. Update environment variable
# 4. Delete old key after grace period
```

## Testing Security

### Manual Testing Checklist

- [ ] OAuth state parameter validation
- [ ] Expired state token rejection
- [ ] Used state token rejection (replay)
- [ ] Invalid state format rejection
- [ ] Missing state parameter rejection
- [ ] Token encryption/decryption cycle
- [ ] RLS policy enforcement (non-admin access)
- [ ] RLS policy enforcement (cross-dealer access)
- [ ] Audit log creation on all operations
- [ ] Rate limit enforcement
- [ ] Webhook signature verification
- [ ] Security headers present in all responses
- [ ] HTTPS enforcement
- [ ] No secrets in API responses
- [ ] No secrets in logs

### Automated Security Tests

```typescript
// Example Playwright security test
test('OAuth CSRF protection', async ({ page }) => {
  // Attempt to use manipulated state token
  await page.goto('/api/slack/callback?code=test&state=malicious');

  // Should redirect to error page
  await expect(page).toHaveURL(/slack=error&reason=invalid_state/);

  // Verify audit log entry
  const { data } = await supabase
    .from('security_audit_log')
    .select('*')
    .eq('event_type', 'OAUTH_INVALID_STATE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  expect(data.severity).toBe('error');
});
```

## Compliance

### OWASP API Security Top 10 Compliance

- ✅ **API1: Broken Object Level Authorization** - RLS policies enforce dealer-scoped access
- ✅ **API2: Broken Authentication** - Supabase Auth + JWT validation
- ✅ **API3: Broken Object Property Level Authorization** - Column-level RLS
- ✅ **API4: Unrestricted Resource Consumption** - Rate limiting implemented
- ✅ **API5: Broken Function Level Authorization** - Role-based RLS policies
- ✅ **API6: Unrestricted Access to Sensitive Business Flows** - Admin-only integration management
- ✅ **API7: Server Side Request Forgery** - URL validation on webhooks
- ✅ **API8: Security Misconfiguration** - Security headers, HTTPS enforcement
- ✅ **API9: Improper Inventory Management** - Documented endpoints, audit logging
- ✅ **API10: Unsafe Consumption of APIs** - Input validation, signature verification

### GDPR Compliance

- ✅ **Data Minimization** - Only necessary OAuth data stored
- ✅ **Purpose Limitation** - Clear integration purposes documented
- ✅ **Storage Limitation** - 90-day audit log retention
- ✅ **Right to Erasure** - Soft deletion support, cascade on user delete
- ✅ **Data Portability** - Export audit logs functionality
- ✅ **Security** - Encryption, access controls, audit logging

## Incident Response

### Security Incident Playbook

1. **Detection**
   - Monitor security_audit_log for critical events
   - Alert on repeated OAUTH_INVALID_STATE events (possible attack)
   - Alert on rate limit violations

2. **Containment**
   - Revoke compromised integration immediately
   - Disable dealer account if necessary
   - Block suspicious IP addresses

3. **Eradication**
   - Rotate encryption keys
   - Force re-authentication of all integrations
   - Update OAuth client secrets

4. **Recovery**
   - Re-enable integrations after validation
   - Restore from encrypted backup if needed

5. **Lessons Learned**
   - Document incident in security_audit_log
   - Update security policies
   - Implement additional monitoring

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)

## Contact

For security concerns or questions:
- Email: security@mydetailarea.com
- Report vulnerabilities via responsible disclosure process
