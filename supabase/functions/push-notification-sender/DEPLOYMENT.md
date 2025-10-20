# Push Notification Sender - Deployment Guide

## Pre-Deployment Checklist

- [ ] VAPID keys generated and saved securely
- [ ] Environment variables documented
- [ ] Database table `push_subscriptions` created
- [ ] Frontend subscription flow tested
- [ ] Test notification payload prepared

## Step 1: Verify Environment Variables

Your VAPID keys should already be configured in Supabase:

```bash
VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
VAPID_PRIVATE_KEY=[your-private-key-here]
VAPID_SUBJECT=mailto:support@mydetailarea.com
```

**Important**: Make sure the private key is NOT committed to version control.

## Step 2: Deploy via Supabase Dashboard (Recommended)

### Option A: Via Dashboard UI

1. **Navigate to Edge Functions**
   - Open [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to **Edge Functions** in the left sidebar

2. **Create/Update Function**
   - Click **Create a new function** or select existing `push-notification-sender`
   - Name: `push-notification-sender`
   - Upload files:
     - `index.ts` (main function code)
     - `deno.json` (dependencies configuration)

3. **Verify Settings**
   - Click **Settings** tab
   - Verify environment variables are present:
     - `VAPID_PUBLIC_KEY`
     - `VAPID_PRIVATE_KEY`
     - `VAPID_SUBJECT`

4. **Deploy**
   - Click **Deploy function**
   - Wait for deployment to complete (~30 seconds)
   - Check logs for any errors

### Option B: Via Supabase CLI

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref ovfykubrknjbqxcbxnra

# 4. Deploy function
supabase functions deploy push-notification-sender

# 5. Verify deployment
supabase functions list
```

## Step 3: Set/Verify Environment Variables

### Via Supabase CLI

```bash
# List current secrets
supabase secrets list

# Set secrets (if not already set)
supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
supabase secrets set VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
supabase secrets set VAPID_SUBJECT=mailto:support@mydetailarea.com
```

### Via Supabase Dashboard

1. Go to **Project Settings** → **Edge Functions**
2. Scroll to **Environment Variables**
3. Add/verify each variable
4. Click **Save**

## Step 4: Test Deployment

### Quick Test (cURL)

```bash
curl -X POST \
  https://ovfykubrknjbqxcbxnra.supabase.co/functions/v1/push-notification-sender \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "122c8d5b-e5f5-4782-a179-544acbaaceb9",
    "dealerId": 5,
    "payload": {
      "title": "Deployment Test",
      "body": "Testing push notification after deployment"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

### Frontend Test

1. **Subscribe to push notifications** (in your app)
2. **Click "Send Test Notification"** button
3. **Check browser** for notification
4. **Verify in logs**:
   - Supabase Dashboard → Edge Functions → push-notification-sender → Logs

## Step 5: Monitor Deployment

### View Logs

**Via Dashboard:**
1. Edge Functions → push-notification-sender
2. Click **Logs** tab
3. Filter by time range
4. Look for:
   - ✅ `Push notification sent successfully`
   - ❌ Error messages with status codes

**Via CLI:**
```bash
supabase functions logs push-notification-sender --follow
```

### Expected Log Output (Success)

```
📥 Request received - userId: 122c8d5b-e5f5-4782-a179-544acbaaceb9 type: string
📥 Request received - dealerId: 5 type: number
🔍 Query filters: is_active=true, dealerId= 5 , userId= 122c8d5b-e5f5-4782-a179-544acbaaceb9
📊 Query results: found 1 subscriptions
  [0] user: 122c8d5b-e5f5-4782-a179-544acbaaceb9, dealer: 5
✅ Found 1 subscriptions - proceeding to send
🔔 Sending push notification to: https://wns2-ch1p.notify.windows.com/w/?token=...
📦 Payload: {"title":"Test Notification","body":"Testing WNS push notifications"...
✅ Push notification sent successfully: { statusCode: 201, headers: {...} }
```

### Common Issues & Solutions

#### Issue: "VAPID keys not configured"
**Solution:**
```bash
supabase secrets list  # Verify keys exist
supabase secrets set VAPID_PRIVATE_KEY=your_key_here
```

#### Issue: "410 Gone" errors
**Solution:**
- Subscription expired (user cleared browser data)
- Function automatically marks as inactive
- User needs to re-subscribe

#### Issue: "403 Forbidden"
**Solution:**
- VAPID keys don't match frontend configuration
- Verify public key matches in both places:
  - Edge Function env vars
  - Frontend service worker

#### Issue: "No subscriptions found"
**Solution:**
```sql
-- Check database for subscriptions
SELECT * FROM push_subscriptions
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
AND is_active = true;
```

## Step 6: Performance Verification

### Expected Metrics

- **Cold start**: < 1 second
- **Warm execution**: < 300ms per notification
- **Success rate**: > 95% (for active subscriptions)

### Monitor in Dashboard

1. Edge Functions → push-notification-sender
2. Check **Invocations** graph
3. Monitor **Error rate**
4. Review **Execution time**

## Step 7: Post-Deployment Tasks

- [ ] Update frontend to point to production endpoint
- [ ] Test with multiple users
- [ ] Test with different payload types
- [ ] Verify cleanup of invalid subscriptions
- [ ] Set up monitoring alerts
- [ ] Document any custom configurations

## Rollback Procedure

If deployment fails:

```bash
# Via CLI - deploy previous version
git checkout HEAD~1 -- supabase/functions/push-notification-sender/
supabase functions deploy push-notification-sender

# Via Dashboard - revert code manually
# 1. Go to Edge Functions
# 2. Edit push-notification-sender
# 3. Paste previous code
# 4. Deploy
```

## Production Monitoring

### Set Up Alerts

Monitor these conditions:
- Error rate > 5%
- Execution time > 2 seconds
- 410 Gone rate > 10% (indicates cleanup needed)

### Regular Maintenance

**Weekly:**
- Review error logs
- Check success rate trends
- Monitor invalid subscription cleanup

**Monthly:**
- Audit VAPID key rotation needs
- Review notification delivery patterns
- Optimize if needed

## Security Notes

1. **Never expose VAPID_PRIVATE_KEY** in logs or frontend code
2. **Use RLS policies** on push_subscriptions table
3. **Validate user permissions** before sending notifications
4. **Rate limit** if sending bulk notifications
5. **Rotate VAPID keys** annually or if compromised

## Support

**Logs to collect for troubleshooting:**
- Edge Function execution logs
- Browser console errors
- Service Worker registration status
- Database subscription records

**Key files:**
- `index.ts` - Main function logic
- `deno.json` - Deno configuration
- `README.md` - Full documentation
- `test-notification.sh` - Test script

## Next Steps

After successful deployment:

1. **Update frontend** to use production function
2. **Test multi-user** scenarios
3. **Monitor for 24 hours** to catch edge cases
4. **Document** any issues encountered
5. **Train team** on monitoring and troubleshooting

## Deployment Completion Checklist

- [ ] Function deployed successfully
- [ ] Environment variables verified
- [ ] Test notification sent successfully
- [ ] Browser received notification
- [ ] Logs show successful execution
- [ ] No errors in error logs
- [ ] Performance metrics acceptable
- [ ] Team notified of deployment
- [ ] Documentation updated

---

**Deployment completed on**: [Add date here]
**Deployed by**: [Add name here]
**Version**: 2.0.0 (WNS Production Ready)
