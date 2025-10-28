# Deployment Guide: send-notification Edge Function

Complete guide for deploying the `send-notification` Edge Function to Supabase.

## Prerequisites

1. **Supabase CLI** installed and authenticated
2. **Firebase project** with Cloud Messaging enabled
3. **FCM Server Key** from Firebase Console

## Step 1: Get FCM Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `my-detail-area`
3. Navigate to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Scroll to **Cloud Messaging API (Legacy)**
5. Copy the **Server key**

> **Note**: If you don't see the Server key, you may need to enable the Cloud Messaging API (Legacy) first.

## Step 2: Set Environment Variables

### Using Supabase CLI

```bash
# Navigate to project directory
cd C:\Users\rudyr\apps\mydetailarea

# Set FCM Server Key secret
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key_here

# Verify secrets are set
supabase secrets list
```

### Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `my-detail-area`
3. Navigate to **Project Settings** → **Edge Functions**
4. In the **Secrets** section, click **Add Secret**
5. Add:
   - Name: `FCM_SERVER_KEY`
   - Value: Your FCM server key
6. Click **Save**

## Step 3: Deploy the Function

### Deploy to Production

```bash
# Navigate to project directory
cd C:\Users\rudyr\apps\mydetailarea

# Deploy the function
supabase functions deploy send-notification

# Verify deployment
supabase functions list
```

### Deploy to Staging (if applicable)

```bash
# Deploy to staging project
supabase link --project-ref your-staging-project-ref
supabase functions deploy send-notification
```

## Step 4: Test the Deployment

### Using cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "userId": "test-user-uuid",
    "dealerId": 1,
    "title": "Test Notification",
    "body": "Testing deployment"
  }'
```

### Using the Test Script

```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your_anon_key
export TEST_USER_ID=user-uuid-here
export TEST_DEALER_ID=1

# Run test suite
cd supabase/functions/send-notification
deno run --allow-net --allow-env test.ts
```

### Using Supabase Dashboard

1. Go to **Edge Functions** → `send-notification`
2. Click **Invoke function**
3. Enter test payload:
   ```json
   {
     "userId": "test-user-uuid",
     "dealerId": 1,
     "title": "Test",
     "body": "Test notification"
   }
   ```
4. Click **Invoke**
5. Check response

## Step 5: Monitor the Function

### View Logs

```bash
# Follow logs in real-time
supabase functions logs send-notification --follow

# View last 100 log entries
supabase functions logs send-notification --tail 100
```

### Check Database Logs

Query the `edge_function_logs` table:

```sql
-- View recent logs
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
ORDER BY created_at DESC
LIMIT 50;

-- Count by log level
SELECT level, COUNT(*) as count
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY level;

-- Find errors
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Monitor Performance

Create a monitoring query:

```sql
-- Notification success rate (last 24 hours)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  SUM((data->>'sent')::int) as total_sent,
  SUM((data->>'failed')::int) as total_failed,
  ROUND(
    (SUM((data->>'sent')::int)::decimal /
    NULLIF(SUM((data->>'sent')::int) + SUM((data->>'failed')::int), 0) * 100),
    2
  ) as success_rate_pct
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'info'
  AND message = 'Batch notification send completed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

## Step 6: Update Function (Rolling Updates)

When you need to update the function:

```bash
# 1. Make your changes to index.ts

# 2. Test locally (optional)
supabase functions serve send-notification

# 3. Deploy the update
supabase functions deploy send-notification

# 4. Verify the update
supabase functions logs send-notification --tail 20
```

> **Note**: Supabase automatically handles rolling updates. Old requests complete on the old version, new requests use the new version.

## Troubleshooting

### Function Not Found (404)

**Symptom**: `function "send-notification" not found`

**Solutions**:
1. Verify deployment:
   ```bash
   supabase functions list
   ```
2. Redeploy:
   ```bash
   supabase functions deploy send-notification
   ```

### Authentication Error (401)

**Symptom**: `Invalid API key` or `Unauthorized`

**Solutions**:
1. Check your Supabase Anon Key is correct
2. Verify the key hasn't been regenerated
3. Make sure you're using the correct project URL

### FCM Server Key Error (500)

**Symptom**: `FCM_SERVER_KEY environment variable is not configured`

**Solutions**:
1. Set the secret:
   ```bash
   supabase secrets set FCM_SERVER_KEY=your_key
   ```
2. Redeploy the function after setting secrets:
   ```bash
   supabase functions deploy send-notification
   ```
3. Verify secrets are set:
   ```bash
   supabase secrets list
   ```

### No Tokens Found (404)

**Symptom**: Response shows `"error": "No active FCM tokens found for user"`

**Expected Behavior**: This is normal if the user hasn't registered any FCM tokens yet.

**Solutions**:
1. Ensure frontend is registering FCM tokens correctly
2. Check `fcm_tokens` table:
   ```sql
   SELECT * FROM fcm_tokens
   WHERE user_id = 'user-uuid-here'
     AND dealer_id = 42
     AND is_active = true;
   ```
3. Verify token registration is working in frontend

### High Failure Rate

**Symptom**: Many notifications showing `failed > 0`

**Solutions**:
1. Check FCM Server Key is valid
2. Review error logs:
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'send-notification'
     AND level = 'error'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. Check for expired/invalid tokens (automatically marked inactive)
4. Verify Firebase Cloud Messaging API is enabled

### Slow Performance

**Symptom**: Function takes too long to respond

**Solutions**:
1. Check database indexes:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'fcm_tokens';
   ```
2. Monitor concurrent invocations
3. Consider batching notifications if sending to many users
4. Check network connectivity from Supabase to FCM

## Rollback Procedure

If you need to rollback to a previous version:

```bash
# 1. Check previous deployments (if using version control)
git log --oneline supabase/functions/send-notification/

# 2. Checkout previous version
git checkout <commit-hash> -- supabase/functions/send-notification/

# 3. Redeploy
supabase functions deploy send-notification

# 4. Verify rollback
supabase functions logs send-notification --tail 20
```

## Production Checklist

Before going live, verify:

- [ ] FCM_SERVER_KEY is set correctly
- [ ] Function deploys without errors
- [ ] Test notifications are received
- [ ] Error handling works as expected
- [ ] Database logging is working
- [ ] Monitoring queries are set up
- [ ] Frontend integration is tested
- [ ] Token cleanup (invalid tokens) is working
- [ ] Rate limiting is considered (if needed)
- [ ] Documentation is reviewed by team

## Monitoring Alerts (Recommended)

Set up alerts for:

1. **High Error Rate**: More than 10% of notifications failing
2. **Function Errors**: Any 500 errors
3. **No Tokens**: Frequent 404 responses (may indicate registration issues)
4. **Slow Response**: Response time > 5 seconds

Example alert query:

```sql
-- High error rate in last hour
SELECT
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  COUNT(*) as total,
  ROUND(
    (COUNT(*) FILTER (WHERE level = 'error')::decimal / COUNT(*) * 100),
    2
  ) as error_rate_pct
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND created_at > NOW() - INTERVAL '1 hour'
HAVING error_rate_pct > 10;
```

## Security Considerations

1. **Never log full FCM tokens** - Only token previews (first 20 chars)
2. **Use Service Role Key** - Function requires service role for database access
3. **Validate all inputs** - Function validates all request parameters
4. **Rate limiting** - Consider implementing rate limiting in production
5. **Token cleanup** - Invalid tokens are automatically deactivated

## Performance Metrics

Expected performance:

- **Single notification**: < 1 second
- **Batch (10 users)**: < 3 seconds
- **Batch (100 users)**: < 10 seconds
- **Cold start**: < 2 seconds

Monitor actual performance with:

```sql
-- Average response time
SELECT
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_seconds
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'info'
  AND message = 'Batch notification send completed';
```

## Support

For issues or questions:

1. Check logs: `supabase functions logs send-notification`
2. Review documentation: [README.md](./README.md), [INTEGRATION.md](./INTEGRATION.md)
3. Check Supabase status: [status.supabase.com](https://status.supabase.com)
4. Contact Supabase support: [support.supabase.com](https://support.supabase.com)

## Related Documentation

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Function README](./README.md)
- [Integration Guide](./INTEGRATION.md)
