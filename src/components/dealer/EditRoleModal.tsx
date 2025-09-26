import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditRoleModalProps {
  open: boolean;
  onClose: () => void;
  role: {
    id: string;
    role_name: string;
    display_name: string;
    description: string | null;
    permissions: Array<{ module: string; permission_level: string }>;
  } | null;
  onRoleUpdated: () => void;
}

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'sales_orders', name: 'Sales Orders' },
  { id: 'service_orders', name: 'Service Orders' },
  { id: 'recon_orders', name: 'Recon Orders' },
  { id: 'car_wash', name: 'Car Wash' },
  { id: 'get_ready', name: 'Get Ready' },
  { id: 'stock', name: 'Stock' },
  { id: 'contacts', name: 'Contacts' },
  { id: 'reports', name: 'Reports' },
  { id: 'users', name: 'Users' },
  { id: 'settings', name: 'Settings' },
  { id: 'dealerships', name: 'Dealerships' },
];

const PERMISSION_LEVELS = [
  { id: 'view', name: 'View', color: 'bg-green-500' },
  { id: 'edit', name: 'Edit', color: 'bg-blue-500' },
  { id: 'delete', name: 'Delete', color: 'bg-orange-500' },
  { id: 'admin', name: 'Admin', color: 'bg-red-500' },
];

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  open,
  onClose,
  role,
  onRoleUpdated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role) {
      setDisplayName(role.display_name);
      setDescription(role.description || '');

      const permsMap: Record<string, string> = {};
      role.permissions.forEach(p => {
        permsMap[p.module] = p.permission_level;
      });
      setPermissions(permsMap);
    }
  }, [role]);

  const handlePermissionChange = (module: string, level: string | null) => {
    if (level === null) {
      const newPerms = { ...permissions };
      delete newPerms[module];
      setPermissions(newPerms);
    } else {
      setPermissions({ ...permissions, [module]: level });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !displayName) {
      toast({
        title: t('common.error'),
        description: 'Display name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Update role
      const { error: roleError } = await supabase
        .from('dealer_custom_roles')
        .update({
          display_name: displayName,
          description: description || null,
        })
        .eq('id', role.id);

      if (roleError) throw roleError;

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('dealer_role_permissions')
        .delete()
        .eq('role_id', role.id);

      if (deleteError) throw deleteError;

      // Insert new permissions
      const permissionInserts = Object.entries(permissions).map(([module, level]) => ({
        role_id: role.id,
        module,
        permission_level: level
      }));

      if (permissionInserts.length > 0) {
        const { error: permsError } = await supabase
          .from('dealer_role_permissions')
          .insert(permissionInserts);

        if (permsError) throw permsError;
      }

      toast({
        title: t('common.success'),
        description: `Role "${displayName}" updated successfully`
      });

      onRoleUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update role',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.display_name}</DialogTitle>
          <DialogDescription>
            Modify role details and permissions for this dealership role
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Role Name (internal)</Label>
              <Input value={role.role_name} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">Cannot be changed after creation</p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's responsibilities"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Module Permissions</Label>
            <div className="border rounded-lg p-4 space-y-3">
              {MODULES.map((module) => (
                <div key={module.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{module.name}</span>
                  <div className="flex gap-2">
                    {PERMISSION_LEVELS.map((level) => (
                      <Badge
                        key={level.id}
                        className={`cursor-pointer transition-all ${
                          permissions[module.id] === level.id
                            ? `${level.color} text-white`
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        onClick={() =>
                          handlePermissionChange(
                            module.id,
                            permissions[module.id] === level.id ? null : level.id
                          )
                        }
                      >
                        {level.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};