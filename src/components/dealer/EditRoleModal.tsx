import { GranularPermissionManager } from '@/components/permissions/GranularPermissionManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Info, Shield } from 'lucide-react';
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
  dealerId?: string;
  onRoleUpdated: () => void;
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  open,
  onClose,
  role,
  dealerId,
  onRoleUpdated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [hasBasicInfoChanges, setHasBasicInfoChanges] = useState(false);

  useEffect(() => {
    if (role) {
      setDisplayName(role.display_name);
      setDescription(role.description || '');
      setHasBasicInfoChanges(false);
    }
  }, [role]);

  // Track changes to basic info
  useEffect(() => {
    if (role) {
      const changed = displayName !== role.display_name || description !== (role.description || '');
      setHasBasicInfoChanges(changed);
    }
  }, [displayName, description, role]);

  const saveBasicInfo = async (): Promise<boolean> => {
    if (!role || !displayName) {
      toast({
        title: t('common.error'),
        description: 'Display name is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!hasBasicInfoChanges) {
      return true; // Nothing to save
    }

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

      setHasBasicInfoChanges(false);
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update role basic info',
        variant: 'destructive'
      });
      return false;
    }
  };

  const handlePermissionsSaved = async () => {
    // Save basic info first if there are changes
    const basicInfoSaved = await saveBasicInfo();

    if (basicInfoSaved) {
      onRoleUpdated();
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Edit Role: {role.display_name}</DialogTitle>
              <DialogDescription className="mt-1">
                Modify role details and permissions for this dealership role
              </DialogDescription>
            </div>
            {hasBasicInfoChanges && (
              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                Unsaved changes
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Basic Info Section */}
          <Card className="card-enhanced border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName" className="text-sm font-semibold">
                    Display Name *
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Role Name (internal)</Label>
                  <Input
                    value={role.role_name}
                    disabled
                    className="bg-gray-100 border-gray-200 mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                    Cannot be changed after creation
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this role's responsibilities"
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions Section */}
          <Card className="card-enhanced border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Module Permissions</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure access levels for each module
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GranularPermissionManager
                roleId={role.id}
                roleName={role.display_name}
                dealerId={dealerId ? parseInt(dealerId) : undefined}
                onSave={handlePermissionsSaved}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-6 pb-4 pt-4 border-t bg-gray-50/50">
          <p className="text-xs text-muted-foreground mr-auto">
            Click "Save Changes" to save both role information and permissions
          </p>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
