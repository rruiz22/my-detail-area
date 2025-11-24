# 🚀 APPLY REMOTE KIOSK MIGRATION

## Migration File Created ✅

**Location**: `supabase/migrations/20251123000001_create_remote_kiosk_system.sql`

This migration creates the complete Remote Kiosk system backend infrastructure.

---

## 📋 What This Migration Creates

### Database Objects

1. **Enum Type**: `remote_kiosk_token_status`
   - Values: `active`, `used`, `expired`, `revoked`

2. **Table**: `remote_kiosk_tokens`
   - 17 columns for complete token management
   - 6 indexes for optimal performance
   - Row Level Security (RLS) enabled

3. **Triggers** (3):
   - Auto-update `updated_at` timestamp
   - Auto-expire tokens past expiration time
   - Auto-mark as "used" when max uses reached

4. **Functions** (4):
   - `use_remote_kiosk_token()` - Validate and increment usage atomically
   - `revoke_remote_kiosk_token()` - Manually revoke tokens
   - `cleanup_expired_remote_kiosk_tokens()` - Delete old expired tokens
   - `get_active_remote_tokens_for_employee()` - Get active tokens for employee

5. **RLS Policies** (4):
   - Users can view tokens from their dealerships
   - Managers can create tokens
   - Managers can update tokens (for revocation)
   - Admins can delete tokens

---

## 🔧 HOW TO APPLY THE MIGRATION

### Option 1: Supabase Dashboard (SQL Editor) ⭐ RECOMMENDED

1. **Open Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
   ```

2. **Copy the entire migration file**:
   - Open: `supabase/migrations/20251123000001_create_remote_kiosk_system.sql`
   - Select All (Ctrl+A)
   - Copy (Ctrl+C)

3. **Paste into SQL Editor**:
   - Paste the SQL (Ctrl+V)

4. **Execute**:
   - Click **"Run"** button
   - Or press `Ctrl+Enter`

5. **Verify Success**:
   - Should see: "Success. No rows returned"
   - Check for any error messages

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Push all pending migrations
npx supabase db push

# Or push specific migration
npx supabase db remote commit
```

---

## ✅ VERIFY MIGRATION WAS APPLIED

After applying the migration, run this verification query in SQL Editor:

```sql
-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'remote_kiosk_tokens';

-- Check enum type exists
SELECT typname
FROM pg_type
WHERE typname = 'remote_kiosk_token_status';

-- Check functions exist
SELECT proname
FROM pg_proc
WHERE proname LIKE '%remote_kiosk%';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'remote_kiosk_tokens';
```

**Expected Results**:
- Table: `remote_kiosk_tokens` (BASE TABLE)
- Enum: `remote_kiosk_token_status`
- Functions: 4 functions with names containing "remote_kiosk"
- RLS: `rowsecurity = true`

---

## 📊 TEST THE MIGRATION

### Test 1: Check Table Structure

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'remote_kiosk_tokens'
ORDER BY ordinal_position;
```

### Test 2: Check Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'remote_kiosk_tokens';
```

### Test 3: Check RLS Policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'remote_kiosk_tokens';
```

### Test 4: Check Functions

```sql
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname LIKE '%remote_kiosk%'
ORDER BY proname;
```

---

## 🚨 TROUBLESHOOTING

### Error: "type remote_kiosk_token_status already exists"
**Solution**: The migration was already applied. Skip and verify tables exist.

### Error: "table remote_kiosk_tokens already exists"
**Solution**: The migration was already applied. Run verification queries above.

### Error: "relation detail_hub_employees does not exist"
**Solution**: Apply DetailHub employee migration first:
```sql
-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'detail_hub_employees';
```

### Error: "permission denied for table"
**Solution**: Make sure you're using the Supabase service role or logged in as admin user.

---

## 📦 NEXT STEPS AFTER MIGRATION

### 1. Deploy Edge Functions

```bash
# Deploy generate URL function
npx supabase functions deploy generate-remote-kiosk-url

# Deploy validate punch function
npx supabase functions deploy validate-remote-kiosk-punch
```

### 2. Verify Edge Functions

```bash
# List deployed functions
npx supabase functions list

# Should see:
# - generate-remote-kiosk-url
# - validate-remote-kiosk-punch
```

### 3. Set Environment Variables

Go to: `https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/functions`

Add/verify these variables:
- `JWT_SECRET` - For JWT token signing (use existing SUPABASE_JWT_SECRET)
- `MDA_TO_API_KEY` - For mda.to shortlinks (already configured)
- `BASE_URL` - Your app URL (e.g., https://dds.mydetailarea.com)

### 4. Create Storage Bucket

Go to: `https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/storage/buckets`

Create bucket: `time-entries`
- Set as **Public** bucket
- Enable file uploads from authenticated users

---

## 📝 ROLLBACK (If Needed)

If you need to undo the migration:

```sql
-- WARNING: This will delete all remote kiosk data!

-- Drop policies
DROP POLICY IF EXISTS "Users can view tokens from their dealerships" ON remote_kiosk_tokens;
DROP POLICY IF EXISTS "Managers can create tokens" ON remote_kiosk_tokens;
DROP POLICY IF EXISTS "Managers can update tokens" ON remote_kiosk_tokens;
DROP POLICY IF EXISTS "Admins can delete tokens" ON remote_kiosk_tokens;

-- Drop functions
DROP FUNCTION IF EXISTS use_remote_kiosk_token(TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS revoke_remote_kiosk_token(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_remote_kiosk_tokens();
DROP FUNCTION IF EXISTS get_active_remote_tokens_for_employee(UUID);

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_remote_kiosk_tokens_updated_at ON remote_kiosk_tokens;
DROP TRIGGER IF EXISTS trigger_auto_expire_remote_kiosk_tokens ON remote_kiosk_tokens;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_remote_kiosk_tokens_updated_at();
DROP FUNCTION IF EXISTS auto_expire_remote_kiosk_tokens();

-- Drop table
DROP TABLE IF EXISTS remote_kiosk_tokens;

-- Drop enum
DROP TYPE IF EXISTS remote_kiosk_token_status;
```

---

## ✨ MIGRATION COMPLETE CHECKLIST

- [ ] Migration file applied successfully
- [ ] Verification queries pass
- [ ] Table `remote_kiosk_tokens` exists
- [ ] Enum `remote_kiosk_token_status` exists
- [ ] 4 helper functions created
- [ ] 3 triggers created
- [ ] 4 RLS policies created
- [ ] 6 indexes created
- [ ] Edge Functions deployed (next step)
- [ ] Storage bucket `time-entries` created (next step)
- [ ] Environment variables configured (next step)

---

**Time Estimate**: 5 minutes
**Complexity**: Low (straightforward SQL execution)
**Dependencies**: DetailHub employees table must exist

**Ready to deploy Edge Functions after this migration is applied!**
