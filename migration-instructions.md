# Auto QR Generation Migration Instructions

## Migration File: `20250916000001_auto_qr_generation.sql`

This migration sets up automatic QR code generation when orders are created in the system.

## What this migration includes:

### 1. Trigger Function
- **Function**: `auto_generate_qr_on_order_insert()`
- **Purpose**: Automatically generates QR codes when new orders are inserted
- **Mechanism**: Uses `net.http_post()` to call the Edge Function for QR generation

### 2. Database Trigger
- **Trigger**: `trigger_auto_generate_qr_on_insert`
- **Table**: `public.orders`
- **Event**: `AFTER INSERT`
- **Action**: Calls the auto-generation function for each new order

### 3. Helper Functions
- **`retry_qr_generation_for_order(UUID)`**: Retry QR generation for a specific order
- **`batch_generate_missing_qr_codes()`**: Batch process orders without QR codes
- **`update_qr_generation_status(UUID, TEXT, BOOLEAN)`**: Update QR generation status

### 4. New Columns Added to `orders` table
- `qr_generation_status` (TEXT): Tracks status ('pending', 'generating', 'completed', 'failed')
- `qr_generation_attempts` (INTEGER): Number of generation attempts
- `qr_last_attempt_at` (TIMESTAMPTZ): Last attempt timestamp

### 5. Database Indexes
- **Index**: `idx_orders_qr_generation_status` on pending/failed statuses

### 6. Permissions
- Grants access to `net.http_post` function for postgres user

## Manual Application Methods:

### Option 1: Supabase Dashboard SQL Editor
1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Navigate to SQL Editor
3. Copy and paste the entire migration file content
4. Execute the SQL

### Option 2: Using psql (if available)
```bash
psql "postgresql://postgres:[password]@db.swfnnrpzpkdypbrzmgnr.supabase.co:5432/postgres" -f supabase/migrations/20250916000001_auto_qr_generation.sql
```

### Option 3: Supabase CLI (requires authentication)
```bash
npx supabase login
npx supabase db push
```

## Verification Steps:

After applying the migration, verify by running these queries:

### 1. Check if trigger exists
```sql
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_generate_qr_on_insert';
```

### 2. Check if new columns exist
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('qr_generation_status', 'qr_generation_attempts', 'qr_last_attempt_at');
```

### 3. Check if functions exist
```sql
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name IN (
    'auto_generate_qr_on_order_insert',
    'retry_qr_generation_for_order',
    'batch_generate_missing_qr_codes',
    'update_qr_generation_status'
);
```

### 4. Check if index exists
```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexname = 'idx_orders_qr_generation_status';
```

## Testing the Auto-Generation:

After migration, test by:

1. Creating a new order through the application
2. Check if `qr_generation_status` is updated to 'generating'
3. Verify QR code and short link are populated after Edge Function completes
4. Check logs for any generation errors

## Rollback (if needed):

To rollback this migration:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_insert ON public.orders;

-- Drop functions
DROP FUNCTION IF EXISTS auto_generate_qr_on_order_insert();
DROP FUNCTION IF EXISTS retry_qr_generation_for_order(UUID);
DROP FUNCTION IF EXISTS batch_generate_missing_qr_codes();
DROP FUNCTION IF EXISTS update_qr_generation_status(UUID, TEXT, BOOLEAN);

-- Remove columns (optional - be careful with data loss)
ALTER TABLE public.orders DROP COLUMN IF EXISTS qr_generation_status;
ALTER TABLE public.orders DROP COLUMN IF EXISTS qr_generation_attempts;
ALTER TABLE public.orders DROP COLUMN IF EXISTS qr_last_attempt_at;

-- Drop index
DROP INDEX IF EXISTS idx_orders_qr_generation_status;
```

## Important Notes:

1. **pg_net Extension**: This migration requires the `pg_net` extension for HTTP calls
2. **Edge Function**: Ensure the `generate-qr-shortlink` Edge Function is deployed
3. **Service Role Key**: The function uses `current_setting('supabase.service_role_key', true)`
4. **Error Handling**: QR generation failures won't prevent order creation
5. **Async Processing**: QR generation happens asynchronously after order insertion

## Environment Configuration Required:

The trigger function expects these settings to be available:
- `app.base_url`: Application base URL (defaults to 'https://my-detail-area.lovable.app')
- `supabase.service_role_key`: Service role key for Edge Function authentication