import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditUserRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    user_id: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
    dealer_custom_roles: {
      id: string;
      role_name: string;
      display_name: string;
    } | null;
  } | null;
  dealerId: number;
  onRoleUpdated: () => void;
}

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  permissions: {
    can_access_internal_notes?: boolean;
    can_view_pricing?: boolean;
    can_delete_orders?: boolean;
    can_export_reports?: boolean;
    can_change_order_status?: boolean;
  };
}

export const EditUserRoleModal: React.FC<EditUserRoleModalProps> = ({
  open,
  onClose,
  user,
  dealerId,
  onRoleUpdated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<CustomRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loadingRoles, setLoadingRoles] = useState(false);

  const fetchAvailableRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const { data, error } = await supabase
        .from('dealer_custom_roles')
        .select('id, role_name, display_name, description, permissions')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load available roles',
        variant: 'destructive'
      });
    } finally {
      setLoadingRoles(false);
    }
  }, [dealerId, toast, t]);

  useEffect(() => {
    if (open) {
      fetchAvailableRoles();
      setSelectedRoleId(user?.dealer_custom_roles?.id || '');
    }
  }, [open, user, fetchAvailableRoles]);

  const getUserFullName = () => {
    if (!user) return '';
    const { first_name, last_name } = user.profiles;
    return `${first_name || ''} ${last_name || ''}`.trim() || user.profiles.email;
  };

  const getSelectedRole = () => {
    return availableRoles.find(r => r.id === selectedRoleId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedRoleId) {
      toast({
        title: t('common.error'),
        description: t('dealer.users.no_role_selected'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Update dealer_memberships.custom_role_id
      const { error: membershipError } = await supabase
        .from('dealer_memberships')
        .update({
          custom_role_id: selectedRoleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (membershipError) throw membershipError;

      // Update or insert user_custom_role_assignments
      const { error: assignmentError } = await supabase
        .from('user_custom_role_assignments')
        .upsert({
          user_id: user.user_id,
          dealer_id: dealerId,
          custom_role_id: selectedRoleId,
          is_active: true,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,dealer_id,custom_role_id'
        });

      if (assignmentError) throw assignmentError;

      toast({
        title: t('common.success'),
        description: t('dealer.users.role_updated')
      });

      onRoleUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.users.error_updating_role'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const selectedRole = getSelectedRole();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('dealer.users.change_role')}
          </DialogTitle>
          <DialogDescription>
            {t('dealer.users.change_role_desc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.user')}:</span>
                  <span className="font-medium">{getUserFullName()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dealer.users.current_role')}:</span>
                  {user.dealer_custom_roles ? (
                    <Badge variant="secondary">{user.dealer_custom_roles.display_name}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('dealer.users.no_role')}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">{t('dealer.users.new_role')} *</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={loadingRoles}>
              <SelectTrigger>
                <SelectValue placeholder={t('dealer.users.select_new_role')} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Selected Role Permissions */}
          {selectedRole && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <Label className="text-sm font-semibold">Permissions Preview</Label>
                </div>
                <div className="space-y-2">
                  {selectedRole.permissions?.can_access_internal_notes && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>{t('permissions.can_access_internal_notes')}</span>
                    </div>
                  )}
                  {selectedRole.permissions?.can_change_order_status && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>{t('permissions.can_change_order_status')}</span>
                    </div>
                  )}
                  {selectedRole.permissions?.can_view_pricing && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>{t('permissions.can_view_pricing')}</span>
                    </div>
                  )}
                  {selectedRole.permissions?.can_delete_orders && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>{t('permissions.can_delete_orders')}</span>
                    </div>
                  )}
                  {selectedRole.permissions?.can_export_reports && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span>{t('permissions.can_export_reports')}</span>
                    </div>
                  )}
                  {!selectedRole.permissions?.can_access_internal_notes &&
                   !selectedRole.permissions?.can_change_order_status &&
                   !selectedRole.permissions?.can_view_pricing &&
                   !selectedRole.permissions?.can_delete_orders &&
                   !selectedRole.permissions?.can_export_reports && (
                    <p className="text-sm text-muted-foreground">No special permissions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !selectedRoleId}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.action_buttons.update')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
