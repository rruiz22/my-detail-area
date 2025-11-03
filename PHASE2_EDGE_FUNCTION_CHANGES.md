# Edge Function Changes - Phase 2

## File: `supabase/functions/create-dealer-user/index.ts`

### Change 1: Update Authorization Check (Line 115)

**BEFORE**:
```typescript
if (profileError || !profile || profile.role !== 'admin') {
  console.error('User does not have admin privileges:', profileError || 'Missing admin role')
```

**AFTER**:
```typescript
if (profileError || !profile || !['system_admin', 'supermanager'].includes(profile.role)) {
  console.error('User does not have system_admin or supermanager privileges:', profileError || 'Missing required role')
```

**Rationale**:
- Old system only allowed `admin` role
- New system requires `system_admin` OR `supermanager` to create users
- This change is backward compatible (no `admin` role exists yet)

---

### Change 2: Force role='user' for all dealer users (Line 368)

**BEFORE**:
```typescript
    const profilePayload = {
      id: authUser.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      role: role,  // ← Uses role from form input
      dealership_id: dealershipId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
```

**AFTER**:
```typescript
    const profilePayload = {
      id: authUser.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      role: 'user',  // ← All dealer users = 'user' (custom role defines permissions)
      dealership_id: dealershipId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
```

**Rationale**:
- New system: All dealer users have `role = 'user'`
- Permissions defined by custom role in `dealer_memberships.custom_role_id`
- Prevents creation of users with old roles (manager, technician, etc.)

---

### Change 3: Update Error Messages (Line 116, 134-136)

**BEFORE**:
```typescript
  console.error('User does not have admin privileges:', profileError || 'Missing admin role')

  // ...

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Forbidden: Admin privileges required'
    }),
```

**AFTER**:
```typescript
  console.error('User does not have required privileges:', profileError || 'Missing system_admin or supermanager role')

  // ...

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Forbidden: system_admin or supermanager role required'
    }),
```

**Rationale**: Update error messages to reflect new role requirements

---

## Testing Commands

### Test as system_admin (should work ✅)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <system_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "dealershipId": 5,
    "role": "user",
    "userType": "dealer"
  }'
```

Expected Response:
```json
{
  "success": true,
  "user_id": "uuid",
  "email": "test@example.com",
  "dealership_id": 5,
  "message": "User created successfully"
}
```

Verify in database:
```sql
SELECT id, email, role, dealership_id FROM profiles WHERE email = 'test@example.com';
-- Expected: role = 'user', dealership_id = 5
```

### Test as regular user (should fail ❌)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <regular_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "firstName": "Test",
    "lastName": "User",
    "dealershipId": 5,
    "role": "user",
    "userType": "dealer"
  }'
```

Expected Response:
```json
{
  "success": false,
  "error": "Forbidden: system_admin or supermanager role required"
}
```

---

## Deployment Steps

1. **Backup current version**:
```bash
cd supabase/functions/create-dealer-user
cp index.ts index.ts.backup.$(date +%Y%m%d)
```

2. **Apply changes**:
   - Manually edit `index.ts` with the changes above
   - Or use Claude Code to apply the edits

3. **Deploy to Supabase**:
```bash
npx supabase functions deploy create-dealer-user
```

4. **Test in production**:
   - Run test commands above
   - Verify new user has `role = 'user'`
   - Check Supabase logs for errors

5. **Monitor**:
```bash
npx supabase functions logs create-dealer-user
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Restore backup
cd supabase/functions/create-dealer-user
cp index.ts.backup.YYYYMMDD index.ts

# Redeploy old version
npx supabase functions deploy create-dealer-user
```

Or rollback via Supabase Dashboard → Edge Functions → create-dealer-user → Version History

---

## Security Considerations

✅ **SAFE**: These changes are backward compatible because:
- No `admin` role exists in production (only `system_admin`)
- `system_admin` will still have access after changes
- New `supermanager` role can be added later without breaking existing code

⚠️ **IMPORTANT**:
- Deploy BEFORE applying migration 03 (role constraint change)
- Test thoroughly in staging environment first
- Monitor security_audit_log after deployment

---

Last Updated: 2025-11-03
