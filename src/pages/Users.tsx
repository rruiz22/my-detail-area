import { DashboardLayout } from '@/components/DashboardLayout';
import { UserRoleManager } from '@/components/permissions/UserRoleManager';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

const Users = () => {
  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions across your organization
          </p>
        </div>

        <PermissionGuard module="users" permission="read">
          <UserRoleManager />
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Users;