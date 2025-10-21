import { GranularPermissionManager } from '@/components/permissions/GranularPermissionManager';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Role {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
}

interface EditRoleModalProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  onRoleUpdated: () => void;
}

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

  useEffect(() => {
    if (role) {
      setDisplayName(role.display_name);
      setDescription(role.description || '');
    }
  }, [role]);

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
      // Update role basic info
      const { error: roleError } = await supabase
        .from('dealer_custom_roles')
        .update({
          display_name: displayName,
          description: description || null
        })
        .eq('id', role.id);

      if (roleError) throw roleError;

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

  const handlePermissionsSaved = () => {
    // Toast already shown by GranularPermissionManager
    onRoleUpdated();
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.display_name}</DialogTitle>
          <DialogDescription>
            Modify role details and permissions for this dealership role
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  rows={3}
                />
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
                    'Save Basic Info'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <GranularPermissionManager
              roleId={role.id}
              roleName={role.display_name}
              onSave={handlePermissionsSaved}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
