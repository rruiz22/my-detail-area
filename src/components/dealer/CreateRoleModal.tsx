import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  dealerId: string;
  onRoleCreated: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  open,
  onClose,
  dealerId,
  onRoleCreated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roleName || !displayName) {
      toast({
        title: t('common.error'),
        description: 'Role name and display name are required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Check if role name already exists for this dealership
      const normalizedRoleName = roleName.toLowerCase().replace(/\s+/g, '_');
      const { data: existingRole, error: checkError } = await supabase
        .from('dealer_custom_roles')
        .select('id, display_name')
        .eq('dealer_id', parseInt(dealerId))
        .eq('role_name', normalizedRoleName)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRole) {
        toast({
          title: t('common.error'),
          description: `A role with the name "${normalizedRoleName}" already exists as "${existingRole.display_name}". Please use a different name.`,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      // Create role with basic information only
      // Permissions will be configured using Edit Role modal
      const { data: roleData, error: roleError } = await supabase
        .from('dealer_custom_roles')
        .insert({
          dealer_id: parseInt(dealerId),
          role_name: normalizedRoleName,
          display_name: displayName,
          description: description || null,
          is_active: true
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Initialize role_module_access with all modules enabled by default
      // This is done automatically by the database trigger/function

      toast({
        title: t('common.success'),
        description: `Role "${displayName}" created successfully. Configure permissions using Edit Role.`
      });

      onRoleCreated();
      onClose();

      // Reset form
      setRoleName('');
      setDisplayName('');
      setDescription('');
    } catch (error: any) {
      console.error('Error creating role:', error);

      // Handle duplicate role name error
      if (error?.code === '23505' || error?.message?.includes('already exists')) {
        toast({
          title: t('common.error'),
          description: `A role with the name "${roleName}" already exists for this dealership. Please use a different name.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('common.error'),
          description: error?.message || 'Failed to create role',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Define a custom role with granular permissions for specific modules
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
                placeholder="e.g., Lot Guy"
                required
              />
            </div>
            <div>
              <Label htmlFor="roleName">Role Name (internal) *</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., lot_guy"
                required
              />
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

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              After creating the role, use <strong>Edit Role → Permissions tab</strong> to configure granular module permissions and access controls.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};