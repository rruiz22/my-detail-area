# Enterprise Settings Hub - Implementation Guide

**Migration Package:** `20251025144510_enterprise_settings_hub`
**Created:** October 25, 2025
**Status:** ✅ Ready for Production

---

## 📦 Package Contents

```
supabase/migrations/
├── 20251025144510_enterprise_settings_hub.sql              # Main migration
├── 20251025144510_enterprise_settings_hub_ROLLBACK.sql     # Rollback script
├── 20251025144510_enterprise_settings_hub_VERIFY.sql       # Verification tests
├── ENTERPRISE_SETTINGS_HUB_DOCUMENTATION.md                # Full documentation
└── README_SETTINGS_HUB.md                                  # This file
```

---

## 🎯 What This Migration Does

Creates 4 new database tables for the Settings Hub enterprise feature:

1. **`dealer_integrations`** - Third-party integration configs (Slack, webhooks, Zapier)
2. **`security_audit_log`** - Immutable security audit trail
3. **`notification_templates`** - Multi-channel, multi-language templates
4. **`platform_settings`** - Platform-wide configuration (timezone, currency, etc.)

Plus:
- ✅ 16+ indexes for optimal query performance
- ✅ 12+ RLS policies for enterprise security
- ✅ 2 helper functions for integration testing and audit logging
- ✅ 14 seed records (9 settings + 5 templates)
- ✅ Complete audit trail with automatic triggers

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Review Prerequisites

Ensure these tables exist in your database:
- ✅ `profiles` (with `user_type` column)
- ✅ `dealer_memberships` (with `role` column)
- ✅ `dealerships`
- ✅ `system_settings` (from previous migration)
- ✅ `public.update_updated_at_column()` function

### Step 2: Run Migration

**Option A: Supabase CLI (Recommended)**
```bash
cd C:/Users/rudyr/apps/mydetailarea
supabase migration up
```

**Option B: Supabase Dashboard**
1. Go to Dashboard → Database → Migrations
2. Click "Upload SQL"
3. Select `20251025144510_enterprise_settings_hub.sql`
4. Click "Run"

**Option C: Direct SQL**
```bash
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub.sql
```

### Step 3: Verify Installation

Run the verification script:
```bash
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub_VERIFY.sql
```

Look for ✅ symbols. If you see any ❌ or ✗, review the error messages.

### Step 4: Test Basic Functionality

```sql
-- Test 1: Query platform settings
SELECT * FROM platform_settings WHERE is_public = true;
-- Should return 5 public settings

-- Test 2: Query notification templates
SELECT template_key, language, channel_type FROM notification_templates;
-- Should return 5 templates

-- Test 3: Check RLS is working
SELECT * FROM security_audit_log;
-- Should respect your user permissions
```

---

## 📊 Expected Results

After successful migration:

| Component | Expected Count |
|-----------|---------------|
| Tables | 4 |
| Indexes | 16+ |
| RLS Policies | 12+ |
| Functions | 2 |
| Seed Settings | 9 |
| Seed Templates | 5 |
| Triggers | 3 |

---

## 🔒 Security Notes

### Row-Level Security (RLS)

All tables have RLS enabled with role-based access:

**system_admin** (Full Access):
- ✅ All tables, all operations
- ✅ Create/modify global notification templates
- ✅ Access all security audit logs

**dealer_admin** (Dealership Scope):
- ✅ Manage integrations for their dealership
- ✅ Create custom notification templates
- ✅ View security logs for their dealership
- ✅ Cannot access other dealerships' data

**dealer_manager** (Limited Admin):
- ✅ View and modify integrations
- ✅ View notification templates
- ❌ Cannot delete integrations (admin only)

**dealer_user** (Read-Only):
- ✅ View public platform settings
- ❌ Cannot modify integrations or templates

### Immutable Audit Log

The `security_audit_log` table has **NO UPDATE or DELETE policies** - all audit entries are permanent.

---

## 🧪 Testing Guide

### Test 1: Create Integration

```sql
-- As dealer_admin or dealer_manager
INSERT INTO dealer_integrations (
    dealer_id,
    integration_type,
    config,
    enabled,
    created_by
)
VALUES (
    YOUR_DEALER_ID,
    'slack',
    '{"workspace_url": "https://test.slack.com", "bot_token": "test-token"}'::jsonb,
    false,
    auth.uid()
)
RETURNING id;
```

### Test 2: Test Integration

```sql
SELECT test_dealer_integration('YOUR_INTEGRATION_ID');
-- Should return: {"success": true, "message": "Integration test successful", ...}
```

### Test 3: Log Security Event

```sql
SELECT log_security_event(
    'settings_change',
    'settings',
    'info',
    auth.uid(),
    NULL,
    YOUR_DEALER_ID,
    '{"setting_key": "test", "action": "testing"}'::jsonb,
    true
);
-- Should return UUID of audit log entry
```

### Test 4: Query Templates

```sql
-- Get email template for order creation
SELECT * FROM notification_templates
WHERE template_key = 'order_created'
AND language = 'en'
AND channel_type = 'email'
AND is_global = true;
-- Should return 1 row with full template
```

### Test 5: Update Platform Setting

```sql
-- As system_admin
UPDATE platform_settings
SET setting_value = '"America/Chicago"'::jsonb
WHERE setting_key = 'default_timezone';
-- Should succeed for system_admin, fail for others
```

---

## 🔄 Rollback Instructions

**⚠️ WARNING:** Rollback will **DELETE ALL DATA** in these tables!

### When to Rollback

Only rollback if:
- Migration fails during execution
- Critical bugs discovered immediately after deployment
- Need to modify schema before redeploying

### How to Rollback

```bash
# Option 1: Using psql
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub_ROLLBACK.sql

# Option 2: Using Supabase Dashboard
# Copy contents of ROLLBACK.sql and run in SQL Editor
```

### After Rollback

1. Review error messages
2. Fix any issues in the migration file
3. Re-run the migration with corrections

---

## 📈 Performance Expectations

### Query Performance

| Query Type | Expected Time | Index Used |
|------------|---------------|------------|
| Get integrations for dealer | <5ms | `idx_dealer_integrations_dealer_type` |
| Recent security events (1 month) | <10ms | `idx_security_audit_created_at` |
| Template lookup by key | <5ms | `idx_notification_templates_key_language` |
| Public platform settings | <5ms | `idx_platform_settings_public` |

### Storage Estimates

**After 1 year** (assumes moderate usage):
- `dealer_integrations`: ~1,000 rows (~1 MB)
- `security_audit_log`: ~1M rows (~500 MB)
- `notification_templates`: ~500 rows (~2 MB)
- `platform_settings`: ~50 rows (~50 KB)

**Total:** ~503 MB

**Recommendation:** Set up monthly partitioning for `security_audit_log` after 6 months.

---

## 🔧 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause:** Tables already exist from previous run
**Solution:** Either drop tables manually or use `IF NOT EXISTS` (already in migration)

### Issue: RLS policies blocking all access

**Cause:** User doesn't have correct role
**Solution:** Verify user role:
```sql
SELECT id, email, user_type FROM profiles WHERE id = auth.uid();
```

### Issue: Seed data not inserted

**Cause:** Conflict with existing data
**Solution:** Migration uses `ON CONFLICT DO NOTHING` - check if data already exists:
```sql
SELECT COUNT(*) FROM platform_settings;
SELECT COUNT(*) FROM notification_templates;
```

### Issue: Functions not found

**Cause:** Function creation failed
**Solution:** Check for errors in function definitions:
```sql
SELECT proname FROM pg_proc WHERE proname IN ('log_security_event', 'test_dealer_integration');
```

---

## 🎨 Frontend Integration

### React Hooks (TypeScript)

```typescript
// hooks/useDealerIntegrations.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useDealerIntegrations(dealerId: number) {
  return useQuery({
    queryKey: ['dealer-integrations', dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealer_integrations')
        .select('*')
        .eq('dealer_id', dealerId)
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    }
  });
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.rpc(
        'test_dealer_integration',
        { p_integration_id: integrationId }
      );

      if (error) throw error;
      return data;
    }
  });
}

// hooks/usePlatformSettings.ts
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('is_public', true);

      if (error) throw error;

      return data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>);
    }
  });
}

// hooks/useSecurityAuditLog.ts
export function useSecurityAuditLog(dealerId?: number) {
  return useQuery({
    queryKey: ['security-audit', dealerId],
    queryFn: async () => {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}
```

### Settings Page Component

```typescript
// components/settings/IntegrationSettings.tsx
import { useDealerIntegrations, useTestIntegration } from '@/hooks/useDealerIntegrations';

export function IntegrationSettings({ dealerId }: { dealerId: number }) {
  const { data: integrations, isLoading } = useDealerIntegrations(dealerId);
  const { mutate: testIntegration, isPending } = useTestIntegration();

  const handleTestSlack = (integrationId: string) => {
    testIntegration(integrationId, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('Slack integration test successful!');
        } else {
          toast.error(`Test failed: ${result.message}`);
        }
      }
    });
  };

  if (isLoading) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        {integrations?.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onTest={handleTestSlack}
            testLoading={isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## 📚 Additional Resources

**Full Documentation:**
- See `ENTERPRISE_SETTINGS_HUB_DOCUMENTATION.md` for complete API reference
- Includes detailed schema descriptions, usage examples, and best practices

**Database Schema Diagram:**
```
dealerships (1) ←→ (N) dealer_integrations
profiles (1) ←→ (N) security_audit_log (user_id)
profiles (1) ←→ (N) notification_templates (created_by)
```

**Related Tables:**
- `system_settings` - Feature flags and system config
- `profiles` - User management
- `dealer_memberships` - User-dealership relationships

---

## ✅ Post-Migration Checklist

After running the migration, verify:

- [ ] All 4 tables created
- [ ] 16+ indexes created
- [ ] RLS enabled on all tables
- [ ] 12+ RLS policies active
- [ ] 2 helper functions exist
- [ ] 9 platform settings seeded
- [ ] 5 notification templates seeded
- [ ] Verification script passes
- [ ] Test queries work correctly
- [ ] Frontend can query tables

---

## 🤝 Support

**Issues or Questions?**
- Check the troubleshooting section above
- Review full documentation in `ENTERPRISE_SETTINGS_HUB_DOCUMENTATION.md`
- Run verification script to diagnose issues
- Check Supabase logs for error details

**Contact:**
- Database Team: database@mydetailarea.com
- Slack: #database-support

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial release |

---

**Migration Status:** ✅ Ready for Production
**Estimated Deployment Time:** 5-10 minutes
**Risk Level:** Low (fully reversible via rollback)
