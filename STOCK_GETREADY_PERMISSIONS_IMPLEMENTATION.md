# ✅ Stock & Get Ready Module Permissions Implementation

## 📋 Overview

This document details the implementation of granular permissions for the **Stock** and **Get Ready (Productivity)** modules in the MyDetailArea system.

**Date**: 2025-10-21
**Modules Added**: `stock`, `get_ready`
**Total New Permissions**: 33 permissions (8 Stock + 25 Get Ready)

---

## 🎯 Objective

Enable dealerships to configure fine-grained permissions for users working with:
- **Stock Module**: Inventory management, DMS sync, CSV uploads
- **Get Ready Module**: Vehicle prep workflow, work items, approvals, vendors

**Note**: Get Ready and Productivity are now **separate modules** with independent permission controls.

---

## 📊 Permissions Breakdown

### 🚗 Stock Module Permissions (8 total)

| Category | Permission Key | Display Name | Description |
|----------|---------------|--------------|-------------|
| **Access** | `view_inventory` | View Inventory | View stock inventory and vehicle listings |
| **Management** | `edit_vehicles` | Edit Vehicles | Edit vehicle information in stock |
| **Management** | `delete_vehicles` | Delete Vehicles | Delete vehicles from stock inventory |
| **Data Management** | `upload_inventory` | Upload Inventory | Upload inventory via CSV or other formats |
| **Data Management** | `sync_dms` | Sync with DMS | Synchronize inventory with Dealer Management System |
| **Reports** | `export_data` | Export Data | Export stock inventory data and reports |
| **Reports** | `view_analytics` | View Analytics | View stock analytics and metrics |
| **Configuration** | `configure_settings` | Configure Settings | Configure stock module settings and DMS connection |

### 🔧 Get Ready Module Permissions (25 total)

Get Ready workflow includes:

#### Access (2)
- `view_vehicles` - View vehicles in Get Ready workflow
- `view_dashboard` - View Get Ready dashboard and metrics

#### Vehicle Management (3)
- `create_vehicles` - Add new vehicles to Get Ready
- `edit_vehicles` - Edit vehicle information
- `delete_vehicles` - Delete vehicles from Get Ready

#### Work Management (5)
- `view_work_items` - View work items and tasks
- `create_work_items` - Create new work items and tasks
- `edit_work_items` - Edit work items and tasks
- `delete_work_items` - Delete work items and tasks
- `manage_templates` - Manage work item templates

#### Workflow (2)
- `approve_steps` - Approve workflow steps and transitions
- `change_status` - Change vehicle status in workflow

#### Communication (4)
- `view_notes` - View notes and comments
- `create_notes` - Create notes and comments
- `edit_notes` - Edit notes and comments
- `delete_notes` - Delete notes and comments

#### Media (3)
- `view_media` - View photos and media files
- `upload_media` - Upload photos and media files
- `delete_media` - Delete photos and media files

#### Vendors (2)
- `view_vendors` - View vendor information
- `manage_vendors` - Create, edit, and manage vendors

#### Configuration (2)
- `configure_sla` - Configure SLA settings and thresholds
- `configure_workflow` - Configure workflow steps and settings

#### Reports (1)
- `export_data` - Export Get Ready data and reports

---

## 🛠️ Implementation Steps

### Step 1: Apply Database Migration

Run the SQL script in Supabase SQL Editor:

```bash
# File: ADD_STOCK_GETREADY_PERMISSIONS.sql
```

**Expected Results**:
- ✅ 8 stock permissions inserted
- ✅ 25 get_ready permissions inserted
- ✅ Verification queries show all permissions

**Verification Queries**:
```sql
-- Count total permissions
SELECT module, COUNT(*) as count
FROM module_permissions
WHERE module IN ('stock', 'get_ready')
GROUP BY module;

-- Expected:
-- stock: 8
-- get_ready: 25
```

### Step 2: Verify in UI

1. **Navigate to Dealer Details**:
   - Go to `/admin/:id` (e.g., `/admin/5`)
   - Click on "Roles" tab

2. **Edit a Custom Role**:
   - Select any custom role (e.g., "Sales Manager")
   - Click "Edit" or the edit icon
   - Go to the "Permissions" tab

3. **Verify New Modules Appear**:
   - ✅ "Stock" section should appear with 8 permissions
   - ✅ "Get Ready" section should appear with 25 permissions
   - ✅ Permissions are organized by category

4. **Test Permission Assignment**:
   - Enable some stock permissions (e.g., "View Inventory", "Edit Vehicles")
   - Enable some get_ready permissions (e.g., "View Vehicles", "Create Work Items")
   - Click "Save Permissions"
   - ✅ Verify toast: "Permissions saved successfully"

### Step 3: Test Permission Enforcement

**Test Stock Module**:
1. Assign a user with "Stock" role having only `view_inventory` permission
2. Log in as that user
3. Navigate to `/stock`
4. ✅ Verify: Can view inventory
5. ✅ Verify: Cannot edit or delete (buttons hidden/disabled)

**Test Get Ready Module**:
1. Assign a user with "Detail Tech" role having `view_vehicles` and `create_work_items`
2. Log in as that user
3. Navigate to `/get-ready`
4. ✅ Verify: Can view vehicles
5. ✅ Verify: Can create work items
6. ✅ Verify: Cannot delete vehicles or approve steps

---

## 🔧 Component Integration

### GranularPermissionManager

The `GranularPermissionManager` component will **automatically** display these new permissions because it dynamically loads from the `module_permissions` table.

**No code changes needed** - the UI is data-driven!

```typescript
// src/components/permissions/GranularPermissionManager.tsx
// This component queries module_permissions and renders checkboxes
// New permissions will appear automatically grouped by module and category
```

### AppModule Type

Both modules are already defined in the `AppModule` type:

```typescript
// src/hooks/usePermissions.tsx
export type AppModule =
  | 'stock'          // ✅ Already included
  | 'get_ready'      // ✅ Added for Get Ready module
  | 'productivity'   // ✅ Already included (for other productivity tools)
  | ...
```

---

## 📋 Example Permission Configurations

### Example 1: Stock Manager Role

**Permissions**:
- ✅ `view_inventory`
- ✅ `edit_vehicles`
- ✅ `upload_inventory`
- ✅ `sync_dms`
- ✅ `view_analytics`
- ✅ `export_data`

**Use Case**: Full stock management access except deletion and configuration

### Example 2: Stock Viewer Role

**Permissions**:
- ✅ `view_inventory`
- ✅ `view_analytics`

**Use Case**: Read-only access to stock information

### Example 3: Get Ready Technician Role

**Permissions**:
- ✅ `view_vehicles`
- ✅ `view_work_items`
- ✅ `create_work_items`
- ✅ `edit_work_items`
- ✅ `view_notes`
- ✅ `create_notes`
- ✅ `view_media`
- ✅ `upload_media`

**Use Case**: Technician can manage work and document progress

### Example 4: Get Ready Manager Role

**Permissions**:
- ✅ All "View" permissions
- ✅ All "Create" permissions
- ✅ All "Edit" permissions
- ✅ `approve_steps`
- ✅ `change_status`
- ✅ `manage_vendors`
- ✅ `configure_sla`

**Use Case**: Full workflow management and approval authority

### Example 5: Get Ready Viewer Role

**Permissions**:
- ✅ `view_vehicles`
- ✅ `view_dashboard`
- ✅ `view_work_items`
- ✅ `view_notes`
- ✅ `view_media`

**Use Case**: Read-only monitoring of Get Ready progress

---

## 🧪 Testing Checklist

### Stock Module Tests

- [ ] Create a role with only `view_inventory`
- [ ] Verify user can access `/stock` route
- [ ] Verify user cannot upload inventory (button hidden)
- [ ] Verify user cannot sync DMS (button hidden)
- [ ] Add `upload_inventory` permission
- [ ] Verify user can now upload CSV

### Get Ready Module Tests

- [ ] Create a role with only `view_vehicles`
- [ ] Verify user can access `/get-ready` route
- [ ] Verify user can see vehicle list
- [ ] Verify user cannot create vehicles (button hidden)
- [ ] Add `create_vehicles` permission
- [ ] Verify user can now add vehicles
- [ ] Test work item creation with/without `create_work_items`
- [ ] Test vendor management with/without `manage_vendors`
- [ ] Test approval flow with/without `approve_steps`

---

## 🚀 Migration Instructions

### For System Administrators

1. **Backup Current Permissions** (optional but recommended):
   ```sql
   -- Create backup
   CREATE TABLE role_module_permissions_backup AS
   SELECT * FROM role_module_permissions_new;
   ```

2. **Run Migration**:
   - Open Supabase Dashboard
   - Navigate to SQL Editor
   - Paste contents of `ADD_STOCK_GETREADY_PERMISSIONS.sql`
   - Click "Run"
   - ✅ Verify success messages

3. **Update Existing Roles**:
   - Review each custom role
   - Assign appropriate stock/productivity permissions
   - Save changes

4. **Communicate to Dealers**:
   - Notify dealers of new permission options
   - Provide training materials
   - Recommend role configurations

### For Dealers

1. **Review New Permissions**:
   - Navigate to `/admin/:dealerId` → Roles tab
   - Open each role to see new permission options

2. **Configure Stock Permissions**:
   - Assign inventory management permissions to appropriate roles
   - Consider separating view-only from edit permissions

3. **Configure Get Ready Permissions**:
   - Assign technician permissions to detail staff
   - Assign approval permissions to managers
   - Restrict configuration permissions to administrators

4. **Test with Users**:
   - Have users test their new permissions
   - Adjust as needed based on feedback

---

## 📝 Database Schema

### module_permissions Table

New rows added:

```sql
-- Stock module: 8 rows
-- Get Ready module: 25 rows
-- Total: 33 new permission definitions
```

### Tables Affected

1. **`module_permissions`** - New permission definitions added
2. **`role_module_permissions_new`** - Will store role → permission assignments (via UI)
3. **`user_custom_role_assignments`** - Links users to roles (existing)

---

## 🔍 Troubleshooting

### Issue: Permissions Not Showing in UI

**Solution**:
1. Verify migration ran successfully:
   ```sql
   SELECT COUNT(*) FROM module_permissions WHERE module IN ('stock', 'get_ready');
   -- Should return: 33
   ```
2. Clear browser cache and reload
3. Check browser console for errors
4. Verify `GranularPermissionManager` is fetching permissions correctly

### Issue: Permissions Not Enforcing

**Solution**:
1. Verify role has permissions saved:
   ```sql
   SELECT * FROM role_module_permissions_new
   WHERE role_id = 'YOUR_ROLE_ID';
   ```
2. Verify user has role assigned:
   ```sql
   SELECT * FROM user_custom_role_assignments
   WHERE user_id = 'YOUR_USER_ID' AND is_active = true;
   ```
3. Check `usePermissions` hook is loading permissions correctly
4. Verify `PermissionGuard` components are checking correct permissions

### Issue: Module Not Accessible

**Solution**:
1. Check dealership has module enabled:
   ```sql
   SELECT * FROM dealership_modules
   WHERE dealership_id = X AND module IN ('stock', 'get_ready');
   ```
2. Verify user has at least one permission for the module
3. Check `ModuleProtectedRoute` or `PermissionGuard` on the route

---

## 📚 Related Documentation

- `GRANULAR_PERMISSIONS_IMPLEMENTATION_COMPLETE.md` - Initial granular permissions system
- `DEALER_USERS_ROLE_FIX_COMPLETE.md` - Role display consistency fix
- `DUPLICATE_TOAST_FIX.md` - Toast notification fix

---

## ✅ Summary

- **8 Stock Permissions** added for inventory management
- **25 Get Ready Permissions** added for Get Ready workflow
- **Separate Modules** - Stock and Get Ready are independent modules
- **Data-driven UI** automatically displays new permissions
- **Backward compatible** with existing permission system
- **Ready for production** use

### Next Steps

1. ✅ Apply SQL migration
2. ✅ Verify in Supabase dashboard
3. ✅ Test in UI (edit custom role)
4. ✅ Configure roles for your dealerships
5. ✅ Train users on new permission model

---

**Implementation Complete** 🎉

All permissions are now available for configuration in the Custom Roles system!
