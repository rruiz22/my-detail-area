# Get Ready Module - Database Setup Guide

## Overview
This guide explains how to set up the database for the Get Ready module, a comprehensive vehicle reconditioning workflow management system.

## Migration File
`20250929000000_create_get_ready_module.sql`

## What's Included

### Tables Created

1. **`get_ready_steps`** - Workflow step definitions
   - Configurable workflow steps per dealership
   - SLA tracking, capacity limits, cost tracking
   - Support for parallel processing and express lanes

2. **`get_ready_vehicles`** - Vehicle tracking
   - Complete vehicle information (VIN, stock number, make/model/year)
   - Workflow assignment (step, priority, workflow type)
   - Time tracking (intake, completion, days in step)
   - SLA monitoring (on_track, warning, critical)
   - Cost tracking (holding costs, T2L metrics)

### Custom Types (Enums)
- `get_ready_workflow_type`: standard, express, priority
- `get_ready_priority`: low, normal, medium, high, urgent
- `get_ready_sla_status`: on_track, warning, critical

### Security (RLS)
✅ Row Level Security enabled on all tables
✅ Policies based on dealer membership
✅ Permission-based access control

### Automatic Features
- **Auto-updating timestamps** - `updated_at` automatically maintained
- **Days in step calculation** - Automatically calculated on update
- **SLA status updates** - Automatically updated based on time thresholds
- **Holding cost calculation** - Daily costs calculated automatically

### Analytics Functions

1. **`get_step_vehicle_counts(dealer_id)`** - Vehicle distribution per step
2. **`get_ready_kpis(dealer_id)`** - Complete KPI dashboard
   - Average T2L (Time to Line)
   - Daily throughput
   - Utilization rate
   - SLA compliance
   - Holding costs

3. **`create_default_get_ready_steps(dealer_id)`** - Creates 5 default steps:
   - Inspection (48h SLA)
   - Mechanical (120h SLA)
   - Body Work (96h SLA)
   - Detailing (24h SLA)
   - Ready (0h SLA)

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply the migration
npx supabase db push

# Verify migration
npx supabase db diff
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `20250929000000_create_get_ready_module.sql`
5. Click **Run**

### Option 3: Manual Application

```bash
# Connect to your database
psql <YOUR_DATABASE_CONNECTION_STRING>

# Run the migration
\i supabase/migrations/20250929000000_create_get_ready_module.sql
```

## Post-Migration Steps

### 1. Create Default Steps for Existing Dealerships

```sql
-- Run this for each existing dealership
SELECT create_default_get_ready_steps(YOUR_DEALER_ID);

-- Or run for all dealerships
SELECT create_default_get_ready_steps(id)
FROM dealerships;
```

### 2. Verify Tables Were Created

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'get_ready%';

-- Should return:
-- get_ready_steps
-- get_ready_vehicles
```

### 3. Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'get_ready%';

-- Both tables should show rowsecurity = true
```

### 4. Test Data Access

```sql
-- Test as authenticated user
SELECT * FROM get_ready_steps LIMIT 5;
SELECT * FROM get_ready_vehicles LIMIT 5;
```

## Required Permissions

The migration uses these permission keys:
- `get_ready.manage_steps` - Manage workflow steps
- `get_ready.create` - Create vehicles
- `get_ready.update` - Update vehicles
- `get_ready.delete` - Delete vehicles

These should be added to your dealer groups/roles configuration.

## Example Usage

### Creating a Vehicle

```sql
INSERT INTO get_ready_vehicles (
  dealer_id,
  stock_number,
  vin,
  vehicle_year,
  vehicle_make,
  vehicle_model,
  step_id,
  workflow_type,
  priority
) VALUES (
  5, -- your dealer_id
  'STK001',
  '1HGBH41JXMN109186',
  2024,
  'Honda',
  'Civic',
  'inspection',
  'standard',
  'normal'
);
```

### Getting KPIs

```sql
SELECT * FROM get_ready_kpis(5); -- your dealer_id
```

### Getting Step Counts

```sql
SELECT * FROM get_step_vehicle_counts(5); -- your dealer_id
```

## Troubleshooting

### Error: "function user_has_dealer_membership does not exist"
The migration requires helper functions from previous migrations. Ensure all previous migrations are applied.

### Error: "relation dealerships does not exist"
The `dealerships` table must exist before running this migration.

### Error: "relation dealer_groups does not exist"
The `dealer_groups` table must exist before running this migration.

## Rollback

If you need to rollback this migration:

```sql
-- Drop tables (this will delete all data!)
DROP TABLE IF EXISTS public.get_ready_vehicles CASCADE;
DROP TABLE IF EXISTS public.get_ready_steps CASCADE;

-- Drop types
DROP TYPE IF EXISTS get_ready_workflow_type CASCADE;
DROP TYPE IF EXISTS get_ready_priority CASCADE;
DROP TYPE IF EXISTS get_ready_sla_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_step_vehicle_counts(BIGINT);
DROP FUNCTION IF EXISTS public.get_ready_kpis(BIGINT);
DROP FUNCTION IF EXISTS public.create_default_get_ready_steps(BIGINT);
DROP FUNCTION IF EXISTS public.calculate_days_in_step();
DROP FUNCTION IF EXISTS public.update_vehicle_sla_status();
```

## Performance Considerations

- All critical columns have indexes
- RLS policies are optimized for query performance
- Analytics functions use efficient aggregations
- Automatic triggers are lightweight

## Next Steps

1. Apply the migration
2. Create default steps for your dealerships
3. Update your frontend code to use the new tables
4. Test the complete workflow
5. Monitor performance and adjust as needed