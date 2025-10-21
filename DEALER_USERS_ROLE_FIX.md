# ✅ Fix: Role Display Inconsistency in DealerUsers

## 🔍 Problem Solved

**Issue**: The user list in `/admin/:id` (dealer details -> Users tab) was showing different custom roles than the global user management in `/admin` (ManageCustomRolesModal).

- **Incorrect (before)**: DealerUsers showed "Sales Manager" (from legacy `dealer_memberships.custom_role_id`)
- **Correct (after)**: DealerUsers now shows "Used Car Manager" (from `user_custom_role_assignments`)

## 🎯 Root Cause

`DealerUsers.tsx` was reading custom roles from the legacy field `dealer_memberships.custom_role_id`, while `ManageCustomRolesModal.tsx` correctly reads from the new `user_custom_role_assignments` table.

## 🛠️ Changes Implemented

### File Modified: `src/components/dealer/DealerUsers.tsx`

#### 1. Updated Interface (lines 40-56)

**Before**:
```typescript
interface DealerMembership {
  id: string;
  user_id: string;
  is_active: boolean;
  joined_at: string;
  custom_role_id: string | null;  // ❌ Legacy field
  profiles: { ... };
  dealer_custom_roles: { ... } | null;  // ❌ Single role from legacy
}
```

**After**:
```typescript
interface DealerMembership {
  id: string;
  user_id: string;
  is_active: boolean;
  joined_at: string;
  profiles: { ... };
  // ✅ Custom roles from user_custom_role_assignments (new system)
  custom_roles: Array<{
    id: string;
    role_name: string;
    display_name: string;
  }>;
}
```

#### 2. Updated Query Function (lines 78-154)

**Before**:
```typescript
queryFn: async () => {
  const { data, error } = await supabase
    .from('dealer_memberships')
    .select(`
      id, user_id, is_active, joined_at, custom_role_id,
      profiles(first_name, last_name, email),
      dealer_custom_roles(id, role_name, display_name)  // ❌ Legacy join
    `)
  // ...
}
```

**After**:
```typescript
queryFn: async () => {
  // 1. Fetch basic membership info
  const { data: memberships } = await supabase
    .from('dealer_memberships')
    .select(`
      id, user_id, is_active, joined_at,
      profiles!inner(first_name, last_name, email)
    `)
    .eq('dealer_id', parseInt(dealerId));

  // 2. For each user, fetch custom roles from user_custom_role_assignments ✅
  const usersWithRoles = await Promise.all(
    memberships.map(async (member) => {
      const { data: roleAssignments } = await supabase
        .from('user_custom_role_assignments')
        .select(`
          custom_role_id,
          dealer_custom_roles!inner(id, role_name, display_name)
        `)
        .eq('user_id', member.user_id)
        .eq('dealer_id', parseInt(dealerId))
        .eq('is_active', true);

      const customRoles = (roleAssignments || [])
        .map(ra => ra.dealer_custom_roles)
        .filter(Boolean);

      return { ...member, custom_roles: customRoles };
    })
  );

  return usersWithRoles;
}
```

#### 3. Updated UI Display (lines 311-324)

**Before**:
```typescript
<TableCell>
  {user.dealer_custom_roles ? (
    <Badge variant="default" className="text-xs">
      {user.dealer_custom_roles.display_name}  // ❌ Single role
    </Badge>
  ) : (
    <span>No role</span>
  )}
</TableCell>
```

**After**:
```typescript
<TableCell>
  {user.custom_roles && user.custom_roles.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {user.custom_roles.map(role => (  // ✅ Multiple roles
        <Badge key={role.id} variant="default" className="text-xs">
          {role.display_name}
        </Badge>
      ))}
    </div>
  ) : (
    <span>No role</span>
  )}
</TableCell>
```

#### 4. Updated Query Keys (lines 184, 382, 399)

Changed all cache invalidation calls from:
- ❌ `['dealer_memberships', dealerId]`
- ✅ `['dealer_users_with_roles', dealerId]`

This ensures cache consistency after updates.

## ✅ Benefits

1. **Consistency**: Both DealerUsers and ManageCustomRolesModal now read from the same source
2. **Correctness**: Uses the new permission system (`user_custom_role_assignments`)
3. **Future-proof**: Supports multiple roles per user
4. **Better UX**: Displays all assigned roles as separate badges

## 🔍 Verification Steps

To verify the fix works:

1. Navigate to `/admin` -> Users tab
2. Click "Manage" on Alice Ruiz (`rudyruizlima@gmail.com`)
3. Note the roles shown (e.g., "Used Car Manager")
4. Navigate to `/admin/5` (Bmw of Sudbury) -> Users tab
5. Find Alice Ruiz in the table
6. Verify the role badge(s) match what was shown in step 3 ✅

## 📊 Technical Details

- **Query Approach**: Two-step fetch (memberships + roles) using `Promise.all` for parallel execution
- **Performance**: Cached for 5 minutes (`staleTime`), kept in cache for 10 minutes (`gcTime`)
- **Error Handling**: Gracefully handles missing roles with warnings in console
- **Logging**: Detailed console logs for debugging (shows role count per user)

## 🔄 Migration Path

This change supports the migration from the legacy `dealer_memberships.custom_role_id` to the new `user_custom_role_assignments` table. The component now:

- ✅ Reads from `user_custom_role_assignments` (new system)
- ✅ Still respects `dealer_memberships` for basic membership info
- ✅ Supports multiple roles per user (future enhancement)
- ✅ Matches the approach used in `usePermissions.tsx`

---

**Date**: 2025-10-21
**Type**: Bug Fix - Data Consistency
**Impact**: All dealer user lists now show correct custom roles from the authoritative source
