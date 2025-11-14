# SendGrid Setup Guide - MyDetailArea

## Overview
This document outlines the migration from Resend to SendGrid for the password reset email functionality.

## Edge Functions Updated
- ✅ `send-password-reset-email` - Migrated to SendGrid

## Edge Functions Still Using Resend (NOT migrated yet)
- ⏸️ `send-invitation-email`
- ⏸️ `send-invoice-email`
- ⏸️ `send-order-email`

## Required Environment Variables

### Supabase Edge Functions Secrets

You need to set these secrets in your Supabase project:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM_ADDRESS=noreply@mydetailarea.com
EMAIL_FROM_NAME=My Detail Area

# Existing Supabase Variables (already configured)
SUPABASE_URL=https://swfnnrpzpkdypbrzmgnr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PUBLIC_SITE_URL=https://dds.mydetailarea.com
```

### How to Set Supabase Secrets

#### Option 1: Using Supabase CLI
```bash
npx supabase secrets set SENDGRID_API_KEY=your_api_key_here
npx supabase secrets set EMAIL_FROM_ADDRESS=noreply@mydetailarea.com
npx supabase secrets set EMAIL_FROM_NAME="My Detail Area"
```

#### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add each secret:
   - `SENDGRID_API_KEY`
   - `EMAIL_FROM_ADDRESS`
   - `EMAIL_FROM_NAME`

## SendGrid Account Setup

### 1. Create SendGrid Account
- Sign up at https://sendgrid.com/
- Verify your email address
- Complete account setup

### 2. Create API Key
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `MyDetailArea-PasswordReset`
4. Permission: **Full Access** (or **Mail Send** only)
5. Copy the API key (you won't see it again!)

### 3. Domain Authentication (Recommended)
1. Go to **Settings** → **Sender Authentication** → **Domain Authentication**
2. Add domain: `mydetailarea.com`
3. Follow DNS configuration instructions
4. Wait for verification (can take 24-48 hours)

### 4. Single Sender Verification (Quick Alternative)
If domain authentication takes too long:
1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Add sender: `noreply@mydetailarea.com`
3. Verify the email address
4. Use this as `EMAIL_FROM_ADDRESS`

## Testing the Setup

### Test 1: Deploy Edge Function
```bash
# Deploy the updated function
npx supabase functions deploy send-password-reset-email
```

### Test 2: Test Password Reset Flow
```bash
# From your application, trigger a password reset for a test user
# Check Supabase Logs:
npx supabase functions logs send-password-reset-email --tail
```

### Test 3: Check SendGrid Activity
1. Go to SendGrid Dashboard → **Activity**
2. Look for your test email
3. Check delivery status

## Troubleshooting

### Error: "SENDGRID_API_KEY not configured"
- **Solution**: Set the secret in Supabase (see above)
- Verify with: `npx supabase secrets list`

### Error: "EMAIL_FROM_ADDRESS not configured"
- **Solution**: Set the email address secret
- Make sure it's a verified sender in SendGrid

### Error: "SendGrid API error: 403"
- **Cause**: Sender not verified
- **Solution**: Complete domain authentication or single sender verification

### Error: "SendGrid API error: 401"
- **Cause**: Invalid API key
- **Solution**: Regenerate API key in SendGrid and update secret

### Email Not Received
1. Check SendGrid Activity dashboard
2. Check spam folder
3. Verify recipient email is valid
4. Check Supabase function logs for errors

## Migration Checklist

- [x] Remove Resend import from `send-password-reset-email`
- [x] Replace Resend email sending with SendGrid API
- [x] Update environment variable validation
- [x] Test email templates (HTML + Text)
- [ ] Set SendGrid API key in Supabase secrets
- [ ] Set EMAIL_FROM_ADDRESS in Supabase secrets
- [ ] Set EMAIL_FROM_NAME in Supabase secrets
- [ ] Deploy updated Edge Function
- [ ] Test password reset flow end-to-end
- [ ] Verify email delivery in SendGrid dashboard
- [ ] Remove RESEND_API_KEY from Supabase secrets (after testing)

## Cost Comparison

### Resend Pricing
- Free tier: 100 emails/day
- Pro: $20/month for 50,000 emails

### SendGrid Pricing
- Free tier: 100 emails/day forever
- Essentials: $19.95/month for 50,000 emails
- Pro: $89.95/month for 100,000 emails

## Next Steps (Future Migrations)

After password reset is working:
1. Migrate `send-invitation-email` to SendGrid
2. Migrate `send-invoice-email` to SendGrid
3. Migrate `send-order-email` to SendGrid
4. Remove all Resend dependencies

## Support Resources

- SendGrid Docs: https://docs.sendgrid.com/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- SendGrid API Reference: https://docs.sendgrid.com/api-reference/mail-send/mail-send

## Contact

For issues with this setup, contact the development team.
