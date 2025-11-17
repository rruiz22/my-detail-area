# 🚀 Deploy send-invitation-email with SendGrid

## ✅ Migration Completed

The `send-invitation-email` Edge Function has been successfully migrated from **Resend** to **SendGrid**.

### Changes Made

1. **Removed Resend dependency**: Replaced `import { Resend }` with native `fetch()` to SendGrid API
2. **Updated API integration**: Using SendGrid REST API v3 (`https://api.sendgrid.com/v3/mail/send`)
3. **Environment variables**: Now uses `SENDGRID_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`
4. **Categories instead of tags**: SendGrid uses `categories` array for email tagging
5. **Backup created**: Original Resend version saved to `backups/edge-functions/send-invitation-email-RESEND-BACKUP.ts`

### Key Differences from Resend

| Feature | Resend | SendGrid |
|---------|--------|----------|
| **Import** | `import { Resend } from "npm:resend@2.0.0"` | Native `fetch()` |
| **API Key** | `RESEND_API_KEY` | `SENDGRID_API_KEY` |
| **From Address** | `invitations@mydetailarea.com` | `EMAIL_FROM_ADDRESS` (noreply@mydetailarea.com) |
| **Email Method** | `resend.emails.send()` | `fetch('https://api.sendgrid.com/v3/mail/send')` |
| **Tags** | `tags: [{ name, value }]` | `categories: [string, string, string]` |
| **Response** | `data.id` | `X-Message-Id` header |
| **Status Code** | 200 OK | 202 Accepted |

---

## 📋 Deployment Steps

### Prerequisites

Before deploying, ensure you have:

1. ✅ **SendGrid Account** - Active account at https://sendgrid.com/
2. ✅ **SendGrid API Key** - Created with "Mail Send" permissions
3. ✅ **Verified Sender** - Either domain authentication OR single sender verification for `noreply@mydetailarea.com`
4. ✅ **Supabase CLI** - Installed globally (`npm install -g supabase`)

### Step 1: Verify SendGrid Configuration

Check that these secrets are configured in Supabase:

```bash
# List all secrets (safe - doesn't show values)
npx supabase secrets list --project-ref swfnnrpzpkdypbrzmgnr
```

**Expected output should include:**
- `SENDGRID_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`

If missing, set them:

```bash
# Set SendGrid secrets
npx supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --project-ref swfnnrpzpkdypbrzmgnr
npx supabase secrets set EMAIL_FROM_ADDRESS=noreply@mydetailarea.com --project-ref swfnnrpzpkdypbrzmgnr
npx supabase secrets set EMAIL_FROM_NAME="My Detail Area" --project-ref swfnnrpzpkdypbrzmgnr
```

### Step 2: Deploy the Edge Function

**Option A: Using Supabase CLI (Recommended)**

```bash
# Deploy the function
npx supabase functions deploy send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr

# Verify deployment
npx supabase functions list --project-ref swfnnrpzpkdypbrzmgnr
```

**Option B: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Navigate to **Edge Functions**
3. Find `send-invitation-email` function
4. Click **Deploy New Version**
5. Upload the file: `supabase/functions/send-invitation-email/index.ts`
6. Click **Deploy**

### Step 3: Test the Deployment

After deployment, test the function:

```bash
# View real-time logs
npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr --tail

# In another terminal, trigger a test invitation from your app
# OR test manually using curl (see Testing section below)
```

### Step 4: Monitor SendGrid Activity

1. Go to SendGrid Dashboard → **Activity**
2. Look for test emails
3. Verify delivery status
4. Check categories: should see `invitation`, dealership name, role name

---

## 🧪 Testing the Function

### Test 1: Manual Test via Frontend

1. Log into MyDetailArea as admin
2. Go to **Users** → **Send Invitation**
3. Fill in invitation details
4. Click **Send Invitation**
5. Check Supabase logs and SendGrid Activity

### Test 2: Manual Test via curl

```bash
# Get your Supabase service role key
SERVICE_ROLE_KEY="your_service_role_key_here"

# Test payload
curl -X POST \
  https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-invitation-email \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "invitationId": "550e8400-e29b-41d4-a716-446655440000",
    "to": "test@example.com",
    "dealershipName": "Test Dealership",
    "roleName": "dealer_user",
    "inviterName": "John Doe",
    "inviterEmail": "john@example.com",
    "invitationToken": "abc123def456",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Invitation email sent successfully",
  "emailId": "xxxxxxxxx.xxxxxxx",
  "provider": "sendgrid",
  "invitationLink": "https://dds.mydetailarea.com/invitation/abc123def456"
}
```

### Test 3: Check Supabase Logs

```bash
# View logs in real-time
npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr --tail
```

**Look for:**
- ✅ `[INVITATION EMAIL] Sending email via SendGrid to: test@example.com`
- ✅ `[INVITATION EMAIL] Email sent successfully via SendGrid: <message-id>`
- ❌ No errors about `SENDGRID_API_KEY not configured`

---

## 🔍 Troubleshooting

### Error: "SENDGRID_API_KEY not configured"

**Cause**: Secret not set in Supabase Edge Functions

**Solution**:
```bash
npx supabase secrets set SENDGRID_API_KEY=SG.your_key_here --project-ref swfnnrpzpkdypbrzmgnr
```

### Error: "EMAIL_FROM_ADDRESS not configured"

**Cause**: From address secret missing

**Solution**:
```bash
npx supabase secrets set EMAIL_FROM_ADDRESS=noreply@mydetailarea.com --project-ref swfnnrpzpkdypbrzmgnr
```

### Error: "SendGrid API error: 403"

**Cause**: Sender email not verified in SendGrid

**Solution**:
1. Go to SendGrid → **Settings** → **Sender Authentication**
2. Complete **Domain Authentication** for `mydetailarea.com` OR
3. Add **Single Sender Verification** for `noreply@mydetailarea.com`
4. Verify the email address

### Error: "SendGrid API error: 401"

**Cause**: Invalid API key

**Solution**:
1. Go to SendGrid → **Settings** → **API Keys**
2. Create new API key with **Mail Send** permission
3. Copy the key (you won't see it again!)
4. Update Supabase secret:
   ```bash
   npx supabase secrets set SENDGRID_API_KEY=SG.new_key_here --project-ref swfnnrpzpkdypbrzmgnr
   ```

### Email Not Received

**Diagnosis steps:**

1. **Check SendGrid Activity**:
   - Go to SendGrid Dashboard → **Activity**
   - Search for recipient email
   - Check delivery status (processed, delivered, bounced, etc.)

2. **Check Spam Folder**:
   - SendGrid emails may land in spam initially
   - Mark as "Not Spam" to improve deliverability

3. **Check Supabase Logs**:
   ```bash
   npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr
   ```
   Look for errors or successful send confirmations

4. **Verify Email Address**:
   - Make sure recipient email is valid
   - Test with your own email first

### Rate Limiting

The function has built-in rate limiting:
- **10 requests per minute per IP**
- Resets every 60 seconds

If you hit the limit, wait 1 minute and try again.

---

## 📊 Monitoring & Metrics

### SendGrid Dashboard

Monitor email performance:
1. **Activity** - Real-time email delivery status
2. **Statistics** - Delivery rates, opens, clicks
3. **Suppressions** - Bounces, blocks, spam reports

### Supabase Logs

```bash
# View recent logs
npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr

# View real-time logs
npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr --tail

# Filter by error
npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr | grep ERROR
```

### Database Audit Trail

All invitations are logged in `user_audit_log` table:

```sql
SELECT
  event_type,
  affected_user_email,
  metadata->>'email_id' as sendgrid_message_id,
  metadata->>'provider' as email_provider,
  created_at
FROM user_audit_log
WHERE event_type = 'invitation_sent'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Next Steps

After successful deployment:

1. ✅ **Test end-to-end**: Send test invitation and verify receipt
2. ✅ **Monitor SendGrid**: Check delivery rates for first 24 hours
3. ✅ **Update documentation**: Mark `send-invitation-email` as migrated in SENDGRID_SETUP.md
4. 🔄 **Migrate remaining functions**:
   - `send-invoice-email`
   - `send-order-email`
5. 🗑️ **Remove Resend**: After all functions migrated, remove `RESEND_API_KEY` from secrets

---

## 📝 Deployment Checklist

Before going live:

- [ ] SendGrid API key configured in Supabase secrets
- [ ] `EMAIL_FROM_ADDRESS` set to verified sender
- [ ] `EMAIL_FROM_NAME` configured
- [ ] Edge Function deployed successfully
- [ ] Test invitation sent and received
- [ ] SendGrid Activity shows successful delivery
- [ ] Supabase logs show no errors
- [ ] Frontend invitation flow tested
- [ ] Email template renders correctly (HTML + Text)
- [ ] Invitation link works and redirects properly
- [ ] Database audit logs recording properly

---

## 🔗 Resources

- **SendGrid API Docs**: https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase CLI**: https://supabase.com/docs/reference/cli/introduction
- **MyDetailArea Invitation Flow**: See `INVITATION_FLOW_REVIEW.md`

---

## 📞 Support

For issues or questions:
- Check Supabase logs first
- Review SendGrid Activity dashboard
- Verify environment variables are set correctly
- Contact development team if issues persist

---

**Migration Date**: November 17, 2025
**Migrated By**: Claude Code
**Status**: ✅ Ready for Deployment
**Provider**: SendGrid API v3
