# 🚀 Supabase Edge Functions

This directory contains Edge Functions for the My Detail Area platform.

---

## 📁 Functions

### `send-invoice-email`
**Purpose:** Send invoice emails with PDF/Excel attachments via Resend

**Input:**
```typescript
{
  email_history_id: string
  invoice_id: string
  dealership_id: number
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  message?: string
  include_pdf: boolean
  include_excel: boolean
}
```

**Output:**
```typescript
{
  success: boolean
  email_id: string
  message: string
}
```

**Environment Variables:**
- `RESEND_API_KEY` - Your Resend API key
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

**Deploy:**
```bash
supabase functions deploy send-invoice-email
```

---

## 🔧 Development

### Prerequisites
- Supabase CLI installed
- Resend account and API key
- Project linked to Supabase

### Local Testing
```bash
# Serve function locally
supabase functions serve send-invoice-email

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invoice-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"invoice_id":"test","recipients":["test@example.com"]}'
```

### Deploy to Production
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-invoice-email

# View logs
supabase functions logs send-invoice-email
```

---

## 📚 Documentation

See `SETUP_EMAIL_SERVICE.md` in the root directory for detailed setup instructions.

---

## 🔐 Security

- Never commit API keys to git
- Use Supabase Secrets for environment variables
- Functions run with service role key (bypass RLS)
- Validate all inputs in the function

---

## 📊 Monitoring

- View logs in Supabase Dashboard → Edge Functions → Logs
- Check email delivery in Resend Dashboard
- Query `invoice_email_history` table for status
