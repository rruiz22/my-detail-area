# ✅ Fix: Role Display Inconsistency in DealerUsers - COMPLETE

## 🔍 Problems Solved

### Problem 1: Wrong Data Source
**Issue**: The user list in `/admin/:id` (dealer details -> Users tab) was showing different custom roles than the global user management in `/admin` (ManageCustomRolesModal).

- **Incorrect (before)**: DealerUsers showed "Sales Manager" (from legacy `dealer_memberships.custom_role_id`)
- **Correct (after)**: DealerUsers now shows "Used Car Manager" (from `user_custom_role_assignments`)

### Problem 2: Missing dealership_id in Modal
**Issue**: When clicking "Edit Role" on a user, the modal showed "No custom roles assigned" and console warning:
```
⚠️ No dealership_id for user, skipping role fetch
```

**Root Cause**: The `ManageCustomRolesModal` component requires `dealership_id` to fetch roles, but it wasn't being passed in the user object.

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

      console.log(`   📋 User ${member.profiles?.email}: ${customRoles.length} role(s)`);

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

#### 4. Fixed Modal Props (lines 386-403) - **CRITICAL FIX**

**Before**:
```typescript
<ManageCustomRolesModal
  open={showEditRoleModal}
  onClose={() => setShowEditRoleModal(false)}
  user={selectedUser ? {
    id: selectedUser.user_id,
    email: selectedUser.profiles?.email || '',
    first_name: selectedUser.profiles?.first_name || null,
    last_name: selectedUser.profiles?.last_name || null,
    // ❌ Missing dealership_id - caused "No custom roles assigned"
  } : null}
  onRolesUpdated={...}
/>
```

**After**:
```typescript
<ManageCustomRolesModal
  open={showEditRoleModal}
  onClose={() => setShowEditRoleModal(false)}
  user={selectedUser ? {
    id: selectedUser.user_id,
    email: selectedUser.profiles?.email || '',
    first_name: selectedUser.profiles?.first_name || null,
    last_name: selectedUser.profiles?.last_name || null,
    dealership_id: parseInt(dealerId)  // ✅ FIXED: Added dealership_id
  } : null}
  onRolesUpdated={async () => {
    console.log('🔄 [DealerUsers] onRolesUpdated callback triggered');
    await queryClient.invalidateQueries({ queryKey: ['dealer_users_with_roles', dealerId] });
    console.log('✅ [DealerUsers] Cache invalidation complete');
  }}
/>
```

#### 5. Updated Query Keys (lines 184, 382, 400)

Changed all cache invalidation calls from:
- ❌ `['dealer_memberships', dealerId]`
- ✅ `['dealer_users_with_roles', dealerId]`

This ensures cache consistency after updates.

## ✅ Benefits

1. **Consistency**: Both DealerUsers and ManageCustomRolesModal now read from the same source
2. **Correctness**: Uses the new permission system (`user_custom_role_assignments`)
3. **Future-proof**: Supports multiple roles per user
4. **Better UX**: Displays all assigned roles as separate badges
5. **No Warnings**: Fixed the "No dealership_id for user" console warning
6. **Functional Modal**: The edit role modal now correctly shows current roles

## 🔍 Verification Steps

To verify both fixes work:

1. **Navigate to `/admin/5`** (Bmw of Sudbury) → Users tab
2. **Check table display**: Alice Ruiz should show "Used Car Manager" badge ✅
3. **Click "Edit Role" button** (three dots → Edit Role)
4. **Verify modal shows**: "Current Custom Roles" section displays "Used Car Manager" ✅
5. **Check console**: No warnings about "No dealership_id" ✅
6. **Compare with global view**: Navigate to `/admin` → Users tab → Manage for same user
7. **Verify consistency**: Both views show identical roles ✅

## 📊 Technical Details

### Query Performance
- **Approach**: Two-step fetch (memberships + roles) using `Promise.all` for parallel execution
- **Caching**: Cached for 5 minutes (`staleTime`), kept in cache for 10 minutes (`gcTime`)
- **Error Handling**: Gracefully handles missing roles with warnings in console
- **Logging**: Detailed console logs for debugging (shows role count per user)

### Console Output (Expected)
```
🔍 [DealerUsers] Fetching users for dealerId: 5
✅ [DealerUsers] Fetched 3 memberships
   📋 User rudyruizlima@gmail.com: 1 role(s)
   📋 User rruiz@dealerdetailservice.com: 1 role(s)
   📋 User rruiz@lima.llc: 0 role(s)
✅ [DealerUsers] Query complete, enriched 3 users with roles
```

### Warning Fixed
**Before**:
```
⚠️ No dealership_id for user, skipping role fetch
```

**After**:
No warning - roles load correctly ✅

## 🔄 Migration Path

This change supports the migration from the legacy `dealer_memberships.custom_role_id` to the new `user_custom_role_assignments` table. The component now:

- ✅ Reads from `user_custom_role_assignments` (new system)
- ✅ Still respects `dealer_memberships` for basic membership info
- ✅ Supports multiple roles per user (future enhancement)
- ✅ Matches the approach used in `usePermissions.tsx`
- ✅ Properly passes `dealership_id` to all child components

## 📝 Summary of All Changes

| Change | Lines | Status |
|--------|-------|--------|
| Update `DealerMembership` interface | 40-56 | ✅ Done |
| Update query to use `user_custom_role_assignments` | 78-154 | ✅ Done |
| Update UI to show multiple roles | 311-324 | ✅ Done |
| Add `dealership_id` to modal user prop | 390-396 | ✅ Done |
| Update all queryKey references | 184, 382, 400 | ✅ Done |

---

**Date**: 2025-10-21
**Type**: Bug Fix - Data Consistency & Missing Props
**Impact**:
- User list now shows correct custom roles from authoritative source
- Edit role modal now correctly displays current roles
- Console warnings eliminated
- Full consistency between dealer-specific and global user management views
