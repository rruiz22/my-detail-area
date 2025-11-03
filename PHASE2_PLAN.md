# 🚀 PHASE 2 PLAN - Backend Preparation

**Date**: 2025-11-03
**Status**: ⏸️ READY TO START
**Prerequisites**: ✅ Phase 1 Complete (Frontend + Backups + Validation)
**Risk Level**: 🟡 MEDIUM (No data changes yet, but affects user creation)

---

## 📋 EXECUTIVE SUMMARY

### What We're Doing
Preparing backend systems (Edge Functions + SQL Functions) to support the new 3-role system before we migrate user data.

### Why This Matters
If we migrate the database BEFORE updating Edge Functions, new user invitations will fail because the code will try to assign old roles that no longer exist.

### Estimated Time
- **Edge Function Updates**: 2 hours
- **SQL Function Updates**: 1 hour
- **Testing**: 1 hour
- **Total**: 4 hours (without complications)

---

## ✅ PHASE 1 RECAP (COMPLETED)

```
✅ Frontend translations (EN, ES, PT-BR)
✅ TypeScript types updated (is_supermanager added)
✅ Permission logic prepared for 3-role system
✅ Backup tables created (profiles, dealer_memberships, user_custom_role_assignments)
✅ Data validation passed (all managers have custom roles)
✅ Commits: 26c02a4, 9fd13ae
```

---

## 🎯 PHASE 2 OBJECTIVES

1. ✅ **Update Edge Function**: `create-dealer-user`
   - Change auth check from `role === 'admin'` to `['system_admin', 'supermanager'].includes(role)`
   - Always assign `role = 'user'` to new dealer users
   - Test in isolation

2. ✅ **Create Edge Function**: `create-system-user` (NEW)
   - Allow system_admin to create supermanager users
   - Assign `role = 'supermanager'`
   - Set `dealership_id = NULL` (global access)
   - Optional custom role assignment
   - Audit logging

3. ✅ **Update SQL Function**: `accept_dealer_invitation()`
   - Always assign `role = 'user'` for dealer users
   - Don't downgrade system_admin/supermanager if they accept invitation
   - Test edge cases

---

## 📁 FILES TO MODIFY

### 1. Edge Function: create-dealer-user
**Location**: `supabase/functions/create-dealer-user/index.ts`

**Current Code** (Lines 115-120):
```typescript
// Check if user is admin
if (profile.role !== 'admin') {
  return new Response(
    JSON.stringify({ error: 'Forbidden' }),
    { status: 403 }
  );
}
```

**New Code**:
```typescript
// Check if user is system_admin or supermanager
if (!['system_admin', 'supermanager'].includes(profile.role)) {
  return new Response(
    JSON.stringify({ error: 'Forbidden: Requires system_admin or supermanager role' }),
    { status: 403 }
  );
}
```

**Current Code** (Line 372):
```typescript
role: role, // Uses role from form
```

**New Code**:
```typescript
role: 'user', // All dealer users = 'user' (custom role defines permissions)
```

---

### 2. Edge Function: create-system-user (NEW)
**Location**: `supabase/functions/create-system-user/index.ts`

**Requirements**:
- Only callable by `system_admin` (NOT supermanager)
- Creates user with `role = 'supermanager'`
- Sets `dealership_id = NULL` (global access)
- Optionally assigns custom role
- Returns user ID + email
- Logs to audit table

**Implementation Plan**:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  // 1. CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Get calling user's profile
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // 4. CRITICAL: Only system_admin can create supermanagers
    if (profile?.role !== 'system_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only system_admin can create system users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5. Parse request body
    const { email, full_name, custom_role_id } = await req.json()

    // 6. Validate inputs
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 7. Create auth user (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 8. Update profile to supermanager
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'supermanager',
        dealership_id: null, // Global access
        full_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // Rollback: Delete user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 9. Optionally assign custom role
    if (custom_role_id) {
      await supabaseAdmin
        .from('user_custom_role_assignments')
        .insert({
          user_id: newUser.user.id,
          custom_role_id,
          created_at: new Date().toISOString()
        })
    }

    // 10. Audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'create_system_user',
        resource_type: 'profiles',
        resource_id: newUser.user.id,
        metadata: { email, role: 'supermanager' }
      })

    // 11. Success response
    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email,
        role: 'supermanager'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

### 3. SQL Function: accept_dealer_invitation
**Location**: Create migration `20251103000004_update_accept_dealer_invitation.sql`

**Current Behavior**:
- Assigns role from invitation
- Updates dealership_id

**New Behavior**:
- Always assigns `role = 'user'` for dealer users
- Preserves `system_admin`/`supermanager` if they accept invitation (edge case)
- Updates dealership_id

**SQL Migration**:
```sql
-- =====================================================
-- UPDATE FUNCTION: accept_dealer_invitation
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Update invitation system for new role model
-- Impact: MEDIUM - Affects user invitation flow
-- Author: System Migration
--
-- CRITICAL: This MUST be applied BEFORE migration 03
-- (which changes the role constraint)
-- =====================================================

CREATE OR REPLACE FUNCTION accept_dealer_invitation(token_input TEXT)
RETURNS VOID AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM dealer_invitations
  WHERE token = token_input
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Get user ID from auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get current profile
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  -- Update profile with new role logic
  UPDATE profiles
  SET
    role = CASE
      -- Don't downgrade system admins or supermanagers
      WHEN role IN ('system_admin', 'supermanager') THEN role
      -- All dealer users get 'user' role
      ELSE 'user'
    END,
    dealership_id = v_invitation.dealer_id,
    full_name = COALESCE(full_name, v_invitation.full_name),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Create or update dealer membership
  INSERT INTO dealer_memberships (
    user_id,
    dealer_id,
    custom_role_id,
    is_active,
    created_at
  )
  VALUES (
    v_user_id,
    v_invitation.dealer_id,
    v_invitation.custom_role_id,
    true,
    NOW()
  )
  ON CONFLICT (user_id, dealer_id)
  DO UPDATE SET
    custom_role_id = v_invitation.custom_role_id,
    is_active = true,
    updated_at = NOW();

  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  VALUES (
    v_user_id,
    'accept_dealer_invitation',
    'dealer_invitations',
    v_invitation.id,
    jsonb_build_object(
      'dealer_id', v_invitation.dealer_id,
      'custom_role_id', v_invitation.custom_role_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION accept_dealer_invitation(TEXT) IS
'Updated for 3-role system: assigns role=user to dealer users, preserves system_admin/supermanager';
```

---

## 🧪 TESTING PLAN

### 1. Test Edge Function: create-dealer-user

**Test Cases**:
```bash
# Test 1: system_admin can create user ✅
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <system_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "dealership_id": "dealer-uuid",
    "custom_role_id": "role-uuid"
  }'
# Expected: 200 OK, user created with role='user'

# Test 2: supermanager can create user ✅
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <supermanager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "dealership_id": "dealer-uuid",
    "custom_role_id": "role-uuid"
  }'
# Expected: 200 OK, user created with role='user'

# Test 3: regular user CANNOT create user ❌
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <regular_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3@example.com",
    "dealership_id": "dealer-uuid"
  }'
# Expected: 403 Forbidden

# Test 4: Verify new user has role='user' ✅
# Query: SELECT role FROM profiles WHERE email = 'test@example.com';
# Expected: role = 'user'
```

### 2. Test Edge Function: create-system-user

**Test Cases**:
```bash
# Test 1: system_admin can create supermanager ✅
curl -X POST https://your-project.supabase.co/functions/v1/create-system-user \
  -H "Authorization: Bearer <system_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supermanager@example.com",
    "full_name": "Super Manager Test"
  }'
# Expected: 200 OK, user created with role='supermanager'

# Test 2: supermanager CANNOT create supermanager ❌
curl -X POST https://your-project.supabase.co/functions/v1/create-system-user \
  -H "Authorization: Bearer <supermanager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "another@example.com",
    "full_name": "Test"
  }'
# Expected: 403 Forbidden

# Test 3: Verify new supermanager has correct attributes ✅
# Query: SELECT role, dealership_id FROM profiles WHERE email = 'supermanager@example.com';
# Expected: role = 'supermanager', dealership_id = NULL
```

### 3. Test SQL Function: accept_dealer_invitation

**Test Cases**:
```sql
-- Test 1: New user accepts invitation → gets role='user' ✅
-- Setup: Create invitation
INSERT INTO dealer_invitations (dealer_id, email, custom_role_id, token, expires_at)
VALUES ('dealer-uuid', 'newuser@example.com', 'role-uuid', 'test-token-1', NOW() + INTERVAL '7 days');

-- Execute function
SELECT accept_dealer_invitation('test-token-1');

-- Verify
SELECT role FROM profiles WHERE email = 'newuser@example.com';
-- Expected: role = 'user'

-- Test 2: system_admin accepts invitation → keeps role='system_admin' ✅
-- Setup: system_admin exists
UPDATE profiles SET role = 'system_admin' WHERE email = 'rruiz@lima.llc';

-- Create invitation
INSERT INTO dealer_invitations (dealer_id, email, custom_role_id, token, expires_at)
VALUES ('dealer-uuid', 'rruiz@lima.llc', 'role-uuid', 'test-token-2', NOW() + INTERVAL '7 days');

-- Execute function
SELECT accept_dealer_invitation('test-token-2');

-- Verify
SELECT role FROM profiles WHERE email = 'rruiz@lima.llc';
-- Expected: role = 'system_admin' (NOT downgraded to 'user')

-- Test 3: Invalid token → throws exception ❌
SELECT accept_dealer_invitation('invalid-token');
-- Expected: Exception 'Invalid or expired invitation'
```

---

## 🔄 DEPLOYMENT ORDER (CRITICAL)

### Step 1: Update Edge Function (create-dealer-user)
```bash
cd supabase/functions/create-dealer-user
# Make changes to index.ts
npx supabase functions deploy create-dealer-user
```

### Step 2: Create & Deploy Edge Function (create-system-user)
```bash
mkdir -p supabase/functions/create-system-user
# Create index.ts with code above
npx supabase functions deploy create-system-user
```

### Step 3: Apply SQL Migration (accept_dealer_invitation)
```bash
# Via MCP tool
mcp__supabase__apply_migration(
  name: "update_accept_dealer_invitation",
  query: "..." # SQL from above
)
```

### Step 4: Test All Functions
```bash
# Run all test cases above
# Verify results in database
```

---

## ⚠️ RISKS & MITIGATIONS

### Risk 1: Edge Function Deploy Fails
**Scenario**: Function has syntax error or Deno runtime error
**Mitigation**:
- Test locally with Deno first: `deno run --allow-net index.ts`
- Use Supabase CLI to test: `npx supabase functions serve`
- Deploy to staging environment first
**Rollback**: Redeploy previous version from git history

### Risk 2: SQL Function Breaks Invitation Flow
**Scenario**: accept_dealer_invitation throws error
**Mitigation**:
- Test with sample data BEFORE deploying
- Monitor logs after deployment
- Have rollback SQL ready
**Rollback**:
```sql
-- Restore original function from backup
CREATE OR REPLACE FUNCTION accept_dealer_invitation(token_input TEXT)
RETURNS VOID AS $$
-- ... (original code from git history)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Risk 3: New Users Get Wrong Role
**Scenario**: create-dealer-user assigns incorrect role
**Mitigation**:
- Manual verification after first test user
- Query: `SELECT id, email, role FROM profiles WHERE email = 'test@example.com'`
- If wrong role, manually fix: `UPDATE profiles SET role = 'user' WHERE email = 'test@example.com'`
**Rollback**: Manually update user roles in database

---

## 📊 SUCCESS CRITERIA

### Phase 2 Complete When:
- ✅ Edge Function `create-dealer-user` updated and tested
- ✅ Edge Function `create-system-user` created and tested
- ✅ SQL Function `accept_dealer_invitation` updated and tested
- ✅ All test cases pass (3 functions × 3 tests = 9 tests minimum)
- ✅ No errors in Supabase logs
- ✅ Manual verification: New test user has `role = 'user'`
- ✅ Manual verification: New test supermanager has `role = 'supermanager', dealership_id = NULL`

---

## 🚀 NEXT: PHASE 3 (CRITICAL MIGRATIONS)

**Only proceed to Phase 3 after Phase 2 is 100% complete and tested.**

Phase 3 will include:
- Migration 03: Update role constraint + migrate user roles (DESTRUCTIVE)
- Migration 04: Already done (accept_dealer_invitation)
- Migration 05: Update RLS policies (24+ policies)

**Estimated Time for Phase 3**: 3-4 hours (requires maintenance window)

---

## 📞 CHECKLIST BEFORE STARTING PHASE 2

- [ ] Phase 1 complete (✅ Already done)
- [ ] Backups verified (✅ Already done)
- [ ] Validation passed (✅ Already done)
- [ ] Git commits up to date (✅ Already done)
- [ ] Supabase project accessible
- [ ] Edge Function deploy credentials ready
- [ ] Test user accounts available
- [ ] Staging environment available (optional but recommended)
- [ ] Team notified of upcoming changes
- [ ] Rollback plan reviewed

**Ready to start**: YES / NO

---

**Last Updated**: 2025-11-03
**Next Review**: Before starting Phase 2 implementation
**Estimated Duration**: 4 hours (without complications)
