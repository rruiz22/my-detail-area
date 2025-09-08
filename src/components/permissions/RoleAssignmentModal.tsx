import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { safeParseDate } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, UserRole } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'dealer' | 'detail';
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  user_type: 'dealer' | 'detail';
}

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess
}) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const { assignRole, removeRole, refreshPermissions } = usePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      fetchRolesAndUserRoles();
    }
  }, [isOpen, user]);

  const fetchRolesAndUserRoles = async () => {
    if (!user) return;

    try {
      // Fetch available roles for the user type
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, display_name, user_type')
        .eq('user_type', user.user_type)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      setAvailableRoles(rolesData || []);

      // Fetch user's current roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .rpc('get_user_roles', { user_uuid: user.id });

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
        return;
      }

      setUserRoles(userRolesData || []);
    } catch (error) {
      console.error('Error in fetchRolesAndUserRoles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!user || !selectedRole) return;

    setLoading(true);
    try {
      const result = await assignRole(
        user.id,
        selectedRole,
        expiresAt ? expiresAt.toISOString() : undefined
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role assigned successfully'
        });
        setSelectedRole('');
        setExpiresAt(undefined);
        await fetchRolesAndUserRoles();
        refreshPermissions();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!user) return;

    try {
      const result = await removeRole(user.id, roleId);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role removed successfully'
        });
        await fetchRolesAndUserRoles();
        refreshPermissions();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive'
      });
    }
  };

  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const getAvailableRolesForAssignment = () => {
    const assignedRoleNames = userRoles.map(ur => ur.role_name);
    return availableRoles.filter(role => !assignedRoleNames.includes(role.name));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Manage Roles - {user ? getDisplayName(user) : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Roles */}
          <div>
            <Label className="text-base font-medium">Current Roles</Label>
            <div className="mt-2 space-y-2">
              {userRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              ) : (
                userRoles.map((userRole) => (
                  <div
                    key={userRole.role_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <Badge variant="secondary" className="mb-1">
                        {userRole.display_name}
                      </Badge>
                      {userRole.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {userRole.expires_at ? format(safeParseDate(userRole.expires_at) || new Date(), 'PPP') : 'Never'}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(userRole.role_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assign New Role */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Assign New Role</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role-select">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRolesForAssignment().map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expires-at">Expires At (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, 'PPP') : 'No expiration'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole || loading}
              className="w-full"
            >
              {loading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};