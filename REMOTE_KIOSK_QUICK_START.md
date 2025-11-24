# 🚀 Remote Kiosk - Quick Start Guide

## ⚡ 10-Minute Backend Deployment

Follow these steps to deploy the complete Remote Kiosk backend.

---

## Step 1: Apply Database Migration (5 min)

### Using Supabase Dashboard ⭐ RECOMMENDED

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
   ```

2. **Copy Migration SQL**:
   - Open file: `supabase/migrations/20251123000001_create_remote_kiosk_system.sql`
   - Select All (Ctrl+A) → Copy (Ctrl+C)

3. **Paste & Run**:
   - Paste in SQL Editor (Ctrl+V)
   - Click **"Run"** or press Ctrl+Enter

4. **Verify**:
   - Should see: "Success. No rows returned"
   - ✅ Migration complete!

---

## Step 2: Deploy Edge Functions (3 min)

```bash
# Deploy URL generator
npx supabase functions deploy generate-remote-kiosk-url

# Deploy punch validator
npx supabase functions deploy validate-remote-kiosk-punch

# Verify deployment
npx supabase functions list
```

**Expected output**:
```
Functions:
- generate-remote-kiosk-url (deployed)
- validate-remote-kiosk-punch (deployed)
```

---

## Step 3: Verify Environment Variables (1 min)

Go to: `https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/functions`

**Check these variables exist**:
- ✅ `MDA_TO_API_KEY` - For shortlinks (already configured)
- ✅ `SUPABASE_JWT_SECRET` or `JWT_SECRET` - For token signing
- ✅ `BASE_URL` - Your app URL (e.g., https://dds.mydetailarea.com)

**If missing**, add them in the Secrets section.

---

## Step 4: Create Storage Bucket (1 min)

1. **Go to Storage**:
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/storage/buckets
   ```

2. **Create Bucket**:
   - Name: `time-entries`
   - Make it **Public**
   - Enable RLS policies

3. **Done!** ✅

---

## 🎯 Deployment Complete!

Your Remote Kiosk backend is now live and ready to use! 🎉

---

## 📝 Test the Backend (Optional)

### Test 1: Generate URL Endpoint

```bash
curl -X POST \
  https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/generate-remote-kiosk-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-uuid-here",
    "dealershipId": 123,
    "createdBy": "manager-uuid-here",
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

### Test 2: Validate Token Endpoint

```bash
curl -X POST \
  https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/validate-remote-kiosk-punch \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "jwt-token-from-url",
    "pin": "1234",
    "action": "clock_in",
    "photoBase64": "data:image/jpeg;base64,...",
    "ipAddress": "192.168.1.100"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "timeEntryId": "uuid",
  "employee": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "employeeNumber": "EMP-001"
  },
  "message": "clock in successful"
}
```

---

## 🛠️ Next Steps: Frontend Implementation

### Day 2: Remote Kiosk Page

**Create**: `src/pages/RemoteKiosk.tsx`

**Features**:
- Parse JWT from URL (`?token=...`)
- Display employee name/photo
- PIN input (4 digits)
- Camera capture
- Action buttons (Clock In, Clock Out, Break)

### Day 3: URL Generator Modal

**Create**: `src/components/detail-hub/GenerateRemoteKioskModal.tsx`

**Features**:
- Employee selector
- Expiration picker (1-8 hours)
- Max uses input (1-100)
- Generate & copy URL
- QR code display

---

## 📚 Full Documentation

For complete details, see:
- **Implementation Guide**: `REMOTE_KIOSK_IMPLEMENTATION.md`
- **Migration Instructions**: `APPLY_REMOTE_KIOSK_MIGRATION.md`
- **Day 1 Summary**: `REMOTE_KIOSK_DAY1_COMPLETE.md`

---

## 🚨 Troubleshooting

### Migration Error: "type already exists"
✅ Already applied. Skip to Step 2.

### Edge Function Error: "MDA_TO_API_KEY not configured"
➡️ Add environment variable in Supabase Dashboard → Settings → Functions → Secrets

### Photo Upload Error: "bucket not found"
➡️ Create `time-entries` bucket in Supabase Storage

### Token Validation Error: "Invalid token"
➡️ Check JWT_SECRET matches in both Edge Functions

---

## ✅ Deployment Checklist

- [ ] Step 1: Migration applied ✅
- [ ] Step 2: Edge Functions deployed ✅
- [ ] Step 3: Environment variables verified ✅
- [ ] Step 4: Storage bucket created ✅
- [ ] Backend tested (optional) ✅
- [ ] Ready for frontend implementation! 🎉

---

**Total Time**: ~10 minutes
**Difficulty**: Easy
**Result**: Production-ready Remote Kiosk backend! 🚀
