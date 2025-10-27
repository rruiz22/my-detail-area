# Enterprise Settings Hub - Deployment Checklist

**Migration:** `20251025144510_enterprise_settings_hub.sql`
**Estimated Time:** 10-15 minutes
**Risk Level:** 🟢 Low (fully reversible)

---

## 📋 Pre-Deployment Checklist

### 1. Environment Verification
- [ ] Connected to correct database (staging/production)
- [ ] Database URL verified: `echo $DATABASE_URL`
- [ ] Supabase CLI installed and authenticated
- [ ] PostgreSQL client (psql) available

### 2. Prerequisites Check
```sql
-- Run these queries to verify prerequisites
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'dealer_memberships', 'dealerships', 'system_settings');
-- Should return 4 rows

SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_updated_at_column';
-- Should return 1 row

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'user_type';
-- Should return 1 row
```

- [ ] All 4 prerequisite tables exist
- [ ] `update_updated_at_column()` function exists
- [ ] `profiles.user_type` column exists
- [ ] `dealer_memberships.role` column exists

### 3. Backup & Safety
- [ ] **CRITICAL:** Database backup completed
- [ ] Backup tested and verified
- [ ] Point-in-time recovery enabled
- [ ] Rollback script reviewed: `20251025144510_enterprise_settings_hub_ROLLBACK.sql`
- [ ] Maintenance window scheduled (if required)

---

## 🚀 Deployment Steps

### Step 1: Review Migration
- [ ] Read migration file: `20251025144510_enterprise_settings_hub.sql`
- [ ] Understand what will be created (4 tables, 16+ indexes, 12+ policies)
- [ ] Review seed data (9 settings + 5 templates)
- [ ] No conflicts with existing objects

**Command:**
```bash
cat supabase/migrations/20251025144510_enterprise_settings_hub.sql | less
```

### Step 2: Execute Migration

**Option A: Supabase CLI (Recommended)**
```bash
cd C:/Users/rudyr/apps/mydetailarea
supabase migration up
```

- [ ] Migration started
- [ ] No errors in console
- [ ] Migration completed successfully

**Option B: Direct SQL**
```bash
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub.sql
```

- [ ] SQL executed
- [ ] All statements succeeded
- [ ] No error messages

**Option C: Supabase Dashboard**
1. [ ] Navigate to Dashboard → Database → Migrations
2. [ ] Click "Upload SQL"
3. [ ] Select migration file
4. [ ] Click "Run"
5. [ ] Verify completion message

### Step 3: Verify Installation

**Run Verification Script:**
```bash
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub_VERIFY.sql
```

**Expected Output:**
```
=== VERIFYING TABLES ===
✅ All 4 tables created successfully
  ✓ dealer_integrations
  ✓ security_audit_log
  ✓ notification_templates
  ✓ platform_settings

=== VERIFYING INDEXES ===
Total indexes created: 16+
  dealer_integrations: 3 indexes
  security_audit_log: 6 indexes
  notification_templates: 4 indexes
  platform_settings: 3 indexes

=== VERIFYING ROW LEVEL SECURITY ===
✅ RLS enabled on all 4 tables

=== VERIFYING RLS POLICIES ===
Total RLS policies: 12+
  dealer_integrations: 4 policies
  security_audit_log: 2 policies
  notification_templates: 4 policies
  platform_settings: 2 policies

=== VERIFYING FUNCTIONS ===
  ✓ log_security_event()
  ✓ test_dealer_integration()

=== VERIFYING SEED DATA ===
✅ Platform settings: 9 rows (expected >= 9)
✅ Notification templates: 5 rows (expected >= 5)
```

**Checklist:**
- [ ] All tables created (4/4) ✅
- [ ] All indexes created (16+) ✅
- [ ] RLS enabled on all tables ✅
- [ ] All RLS policies active (12+) ✅
- [ ] Functions created (2/2) ✅
- [ ] Triggers configured (3/3) ✅
- [ ] Seed data inserted (14/14) ✅
- [ ] No ❌ or ✗ symbols in output

### Step 4: Manual Testing

**Test 1: Query Tables**
```sql
-- Should return data
SELECT * FROM platform_settings WHERE is_public = true;
SELECT * FROM notification_templates WHERE is_global = true;

-- Should return empty (no integrations yet)
SELECT * FROM dealer_integrations;

-- Should return empty (no audit logs yet)
SELECT * FROM security_audit_log;
```

- [ ] Platform settings query successful (9 rows)
- [ ] Notification templates query successful (5 rows)
- [ ] Dealer integrations query successful (0 rows)
- [ ] Security audit log query successful (0 rows)

**Test 2: Test Functions**
```sql
-- Test audit logging (should return UUID)
SELECT log_security_event(
    'settings_change',
    'settings',
    'info',
    auth.uid(),
    NULL,
    NULL,
    '{"test": true}'::jsonb,
    true
);

-- Verify audit entry created
SELECT * FROM security_audit_log WHERE metadata->>'test' = 'true';
```

- [ ] `log_security_event()` returns UUID
- [ ] Audit entry created in `security_audit_log`
- [ ] Metadata stored correctly

**Test 3: Test RLS Policies**
```sql
-- As system_admin - should see all
SELECT COUNT(*) FROM security_audit_log;

-- As dealer_admin - should see dealership scope
SELECT COUNT(*) FROM dealer_integrations;

-- As dealer_user - should see public settings only
SELECT COUNT(*) FROM platform_settings WHERE is_public = true;
```

- [ ] System admin has full access
- [ ] Dealer admin sees dealership-scoped data
- [ ] Dealer user sees public data only
- [ ] RLS working as expected

**Test 4: Test Constraints**
```sql
-- Should succeed - valid integration
INSERT INTO dealer_integrations (
    dealer_id, integration_type, config, created_by
) VALUES (
    1, 'slack', '{"test": true}'::jsonb, auth.uid()
);

-- Should fail - duplicate integration_type for same dealer
INSERT INTO dealer_integrations (
    dealer_id, integration_type, config, created_by
) VALUES (
    1, 'slack', '{"test": true}'::jsonb, auth.uid()
);
-- Expected: ERROR - duplicate key value violates unique constraint
```

- [ ] Valid INSERT succeeds
- [ ] Duplicate INSERT fails with constraint error
- [ ] Unique constraints working

### Step 5: Performance Check

**Query Performance Tests:**
```sql
EXPLAIN ANALYZE
SELECT * FROM dealer_integrations
WHERE dealer_id = 1 AND integration_type = 'slack' AND enabled = true;
-- Should use idx_dealer_integrations_dealer_type

EXPLAIN ANALYZE
SELECT * FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 100;
-- Should use idx_security_audit_created_at

EXPLAIN ANALYZE
SELECT * FROM notification_templates
WHERE template_key = 'order_created' AND language = 'en' AND channel_type = 'email';
-- Should use idx_notification_templates_key_language
```

- [ ] Integration query uses correct index (<5ms)
- [ ] Audit log query uses correct index (<10ms)
- [ ] Template query uses correct index (<5ms)
- [ ] No sequential scans on large tables

---

## 📊 Post-Deployment Verification

### Health Checks
```sql
-- Check table row counts
SELECT
    'dealer_integrations' as table_name, COUNT(*) as row_count
FROM dealer_integrations
UNION ALL
SELECT 'security_audit_log', COUNT(*) FROM security_audit_log
UNION ALL
SELECT 'notification_templates', COUNT(*) FROM notification_templates
UNION ALL
SELECT 'platform_settings', COUNT(*) FROM platform_settings;
```

**Expected:**
- [ ] `dealer_integrations`: 0 rows
- [ ] `security_audit_log`: 0-1 rows (test entry)
- [ ] `notification_templates`: 5 rows
- [ ] `platform_settings`: 9 rows

### Data Integrity
```sql
-- Verify seed data values
SELECT setting_key, setting_value FROM platform_settings
WHERE setting_key IN ('default_timezone', 'default_currency', 'business_name');

SELECT template_key, language, channel_type FROM notification_templates
WHERE template_key IN ('order_created', 'slack_order_created');
```

- [ ] Timezone is "America/New_York"
- [ ] Currency is "USD"
- [ ] Business name is "My Detail Area"
- [ ] Order created template exists (email)
- [ ] Slack order created template exists (slack)

### Security Verification
```sql
-- Verify RLS is active
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings');

-- Should all return rowsecurity = true
```

- [ ] RLS enabled on `dealer_integrations`
- [ ] RLS enabled on `security_audit_log`
- [ ] RLS enabled on `notification_templates`
- [ ] RLS enabled on `platform_settings`

### Monitoring Setup
- [ ] Query performance baseline captured
- [ ] Alert thresholds configured (if applicable)
- [ ] Backup schedule verified
- [ ] Audit log retention policy set

---

## 🎯 Frontend Integration Checklist

### TypeScript Setup
- [ ] Types file imported: `src/types/settings.ts`
- [ ] No TypeScript errors in types file
- [ ] Types integrated with existing codebase

### React Hooks Setup
```typescript
// Verify these hooks work
import {
  useDealerIntegrations,
  useTestIntegration,
  usePlatformSettings,
  useSecurityAuditLog
} from '@/hooks/useSettings';
```

- [ ] Hooks created (or example code reviewed)
- [ ] Supabase client configured correctly
- [ ] TanStack Query configured

### UI Components
- [ ] Settings page route created
- [ ] Integration management UI implemented
- [ ] Security audit dashboard accessible
- [ ] Platform settings admin panel created

---

## 🔄 Rollback Checklist (If Needed)

**⚠️ Only perform rollback if critical issues found!**

### When to Rollback
- [ ] Migration fails during execution
- [ ] Critical bugs discovered in production
- [ ] Performance issues affecting other queries
- [ ] Data integrity issues detected

### Rollback Steps
1. **Stop Application Traffic** (if possible)
   - [ ] Enable maintenance mode
   - [ ] Notify users of rollback

2. **Execute Rollback**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub_ROLLBACK.sql
   ```
   - [ ] Rollback executed
   - [ ] All tables dropped
   - [ ] All functions dropped
   - [ ] No errors in console

3. **Verify Rollback**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings');
   -- Should return 0 rows
   ```
   - [ ] All tables removed
   - [ ] No orphaned objects

4. **Restore Application**
   - [ ] Application back to previous state
   - [ ] No errors in logs
   - [ ] Users notified of resolution

---

## 📝 Documentation Checklist

### Team Notification
- [ ] Database team notified of deployment
- [ ] Frontend team notified of new tables/types
- [ ] DevOps team notified of new tables for monitoring
- [ ] Product team notified of new capabilities

### Documentation Updated
- [ ] Internal wiki updated with migration info
- [ ] API documentation updated (if applicable)
- [ ] Runbook updated with new tables
- [ ] Monitoring dashboards configured

---

## ✅ Final Verification

**All checks completed:**
- [ ] ✅ Pre-deployment checks (3/3)
- [ ] ✅ Migration executed successfully
- [ ] ✅ Verification script passed (7/7 checks)
- [ ] ✅ Manual tests passed (4/4)
- [ ] ✅ Performance validated
- [ ] ✅ Post-deployment verified
- [ ] ✅ Frontend integration ready
- [ ] ✅ Team notified
- [ ] ✅ Documentation updated

**Deployment Status:**
- [ ] 🟢 **SUCCESS** - All checks passed, deployment complete
- [ ] 🟡 **PARTIAL** - Some checks failed, requires attention
- [ ] 🔴 **FAILED** - Critical issues, rollback recommended

---

## 🎉 Deployment Complete!

**Next Steps:**
1. Monitor query performance for 24 hours
2. Set up alerting for critical security events
3. Begin frontend integration development
4. Plan audit log partitioning strategy (after 6 months)
5. Review and optimize indexes based on actual query patterns

**Support:**
- **Issues:** Create ticket in project management system
- **Questions:** Slack #database-support
- **Emergency:** Contact database team lead

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Environment:** [ ] Staging [ ] Production
**Result:** [ ] Success [ ] Partial [ ] Failed
**Notes:** _______________________________________________

---

**Checklist Version:** 1.0.0
**Migration:** 20251025144510_enterprise_settings_hub
**Last Updated:** October 25, 2025
