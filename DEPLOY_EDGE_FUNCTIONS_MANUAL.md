# 🚀 Deploy Edge Functions - Manual Guide

## ⚠️ Issue

The Supabase CLI requires Docker and access token configuration. For faster deployment, use the Supabase Dashboard instead.

---

## ✅ OPTION 1: Deploy via Supabase Dashboard (EASIEST - 5 min)

### Step 1: Deploy `generate-remote-kiosk-url`

1. **Go to Edge Functions**:
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions
   ```

2. **Click "Create a new function"**

3. **Function Details**:
   - **Name**: `generate-remote-kiosk-url`
   - **Import from file**: Browse and select:
     ```
     c:\Users\rudyr\apps\mydetailarea\supabase\functions\generate-remote-kiosk-url\index.ts
     ```

4. **Click "Create function"**

5. **Verify deployment** - Should see function listed as "deployed"

---

### Step 2: Deploy `validate-remote-kiosk-punch`

1. **Click "Create a new function"** again

2. **Function Details**:
   - **Name**: `validate-remote-kiosk-punch`
   - **Import from file**: Browse and select:
     ```
     c:\Users\rudyr\apps\mydetailarea\supabase\functions\validate-remote-kiosk-punch\index.ts
     ```

3. **Click "Create function"**

4. **Verify deployment** - Both functions should now be listed

---

### Step 3: Verify Environment Variables

1. **Go to Settings → Edge Functions**:
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/functions
   ```

2. **Check these secrets exist**:
   - ✅ `MDA_TO_API_KEY` (already configured)
   - ✅ `SUPABASE_JWT_SECRET` (auto-configured)
   - ✅ `BASE_URL` - Add if missing: `https://dds.mydetailarea.com`

3. **Add `BASE_URL` if needed**:
   - Click "Add new secret"
   - Name: `BASE_URL`
   - Value: `https://dds.mydetailarea.com`
   - Click "Save"

---

### Step 4: Test the Functions

#### Test `generate-remote-kiosk-url`:

**Using cURL**:
```bash
curl -X POST \
  https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/generate-remote-kiosk-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-uuid",
    "dealershipId": 123,
    "createdBy": "manager-uuid",
    "expirationHours": 2,
    "maxUses": 1
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "tokenId": "uuid",
  "shortCode": "RMT-123-ABC12",
  "fullUrl": "https://mda.to/rmt-123-abc12",
  "expiresAt": "2025-11-23T15:30:00Z"
}
```

---

## ✅ OPTION 2: Deploy via Supabase CLI (If Docker is Available)

### Prerequisites:
1. **Install Docker Desktop** (if not installed)
2. **Login to Supabase CLI**:
   ```bash
   npx supabase login
   ```

### Deploy Commands:
```bash
# Deploy generate URL function
npx supabase functions deploy generate-remote-kiosk-url --project-ref swfnnrpzpkdypbrzmgnr

# Deploy validate punch function
npx supabase functions deploy validate-remote-kiosk-punch --project-ref swfnnrpzpkdypbrzmgnr

# Verify deployment
npx supabase functions list --project-ref swfnnrpzpkdypbrzmgnr
```

---

## 📝 Post-Deployment Checklist

- [ ] Both functions visible in Supabase Dashboard
- [ ] Environment variables configured (`MDA_TO_API_KEY`, `BASE_URL`)
- [ ] Test `generate-remote-kiosk-url` with sample request
- [ ] Test `validate-remote-kiosk-punch` with sample request
- [ ] Check function logs for errors

---

## 🔍 View Function Logs

1. Go to: `https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/logs/edge-functions`
2. Select function from dropdown
3. Monitor real-time logs

---

## 🚨 Troubleshooting

### Function shows "Failed" status
**Solution**: Check the function logs for specific error messages

### "MDA_TO_API_KEY not configured" error
**Solution**: Add `MDA_TO_API_KEY` in Settings → Edge Functions → Secrets

### "Invalid or expired token" error
**Solution**: Verify `SUPABASE_JWT_SECRET` exists (should be auto-configured)

### Photo upload fails
**Solution**: Create `time-entries` storage bucket:
1. Go to Storage: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/storage/buckets
2. Click "Create bucket"
3. Name: `time-entries`
4. Make it **Public**
5. Click "Create"

---

## ✅ Success Criteria

You'll know deployment is successful when:
- ✅ Both functions appear in the Edge Functions list
- ✅ Function status shows "deployed" (green)
- ✅ Test requests return expected JSON responses
- ✅ Logs show successful execution

---

**Total Time**: ~5 minutes via Dashboard
**Difficulty**: Easy
**Next Step**: Frontend implementation (Day 2)
