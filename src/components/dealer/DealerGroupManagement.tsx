import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, UserGroup, OrderType } from '@/hooks/usePermissions';
import { GroupMembershipManagement } from '@/components/permissions/GroupMembershipManagement';
import { UserGroupAssignment } from '@/components/permissions/UserGroupAssignment';
import { Plus, Edit, Users, Trash2, Shield, Settings, UserCheck } from 'lucide-react';

interface DealerGroupManagementProps {
  dealerId: number;
  dealerName: string;
}

interface GroupFormData {
  name: string;
  slug: string;
  description: string;
  allowed_order_types: OrderType[];
  department: string;
  permission_level: string;
}

type ViewMode = 'groups' | 'memberships' | 'assignments';

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string; description: string }[] = [
  { value: 'sales', label: 'Sales Orders', description: 'Vehicle sales and inventory management' },
  { value: 'service', label: 'Service Orders', description: 'Service department and maintenance' },
  { value: 'recon', label: 'Recon Orders', description: 'Vehicle reconditioning and preparation' },
  { value: 'carwash', label: 'Car Wash', description: 'Quick service and car wash operations' }
];

const DEPARTMENT_OPTIONS = [
  { value: 'sales', label: 'Sales Department' },
  { value: 'service', label: 'Service Department' },
  { value: 'recon', label: 'Reconditioning Department' },
  { value: 'management', label: 'Management' },
  { value: 'support', label: 'Reception & Support' }
];

const PERMISSION_LEVEL_OPTIONS = [
  { value: 'view', label: 'View Only', description: 'Can see data but not modify' },
  { value: 'edit', label: 'Edit Access', description: 'Can create and modify records' },
  { value: 'manage', label: 'Full Management', description: 'Can manage all operations' }
];

export const DealerGroupManagement: React.FC<DealerGroupManagementProps> = ({
  dealerId,
  dealerName
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();

  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    slug: '',
    description: '',
    allowed_order_types: [],
    department: '',
    permission_level: 'view'
  });

  // Fetch groups for this dealer
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dealer_groups')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('department', { ascending: true });

      if (error) throw error;

      const groupsData: UserGroup[] = (data || []).map(group => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        allowed_order_types: group.allowed_order_types as OrderType[],
        dealer_id: group.dealer_id,
        department: group.department,
        permission_level: group.permission_level,
        description: group.description
      }));

      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: t('common.error'),
        description: t('groups.fetch_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Auto-generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  // Handle form changes
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleOrderTypeToggle = (orderType: OrderType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allowed_order_types: checked
        ? [...prev.allowed_order_types, orderType]
        : prev.allowed_order_types.filter(type => type !== orderType)
    }));
  };

  // Create or update group
  const handleSaveGroup = async () => {
    try {
      if (!formData.name.trim() || formData.allowed_order_types.length === 0) {
        toast({
          title: t('common.error'),
          description: t('groups.validation_error'),
          variant: 'destructive'
        });
        return;
      }

      const groupData = {
        dealer_id: dealerId,
        name: formData.name.trim(),
        slug: formData.slug,
        description: formData.description.trim(),
        allowed_order_types: formData.allowed_order_types,
        department: formData.department,
        permission_level: formData.permission_level,
        is_template: false,
        is_active: true
      };

      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('dealer_groups')
          .update(groupData)
          .eq('id', editingGroup.id);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('groups.updated_successfully')
        });
      } else {
        // Create new group
        const { error } = await supabase
          .from('dealer_groups')
          .insert(groupData);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('groups.created_successfully')
        });
      }

      // Reset form and close modal
      setFormData({ name: '', slug: '', description: '', allowed_order_types: [] });
      setEditingGroup(null);
      setShowCreateModal(false);

      // Refresh groups list
      fetchGroups();

    } catch (error) {
      console.error('Error saving group:', error);
      toast({
        title: t('common.error'),
        description: t('groups.save_error'),
        variant: 'destructive'
      });
    }
  };

  // Delete group
  const handleDeleteGroup = async (group: UserGroup) => {
    if (!confirm(t('groups.confirm_delete', { name: group.name }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dealer_groups')
        .update({ is_active: false })
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('groups.deleted_successfully')
      });

      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: t('common.error'),
        description: t('groups.delete_error'),
        variant: 'destructive'
      });
    }
  };

  // Edit group
  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      slug: group.slug,
      description: group.description || '',
      allowed_order_types: group.allowed_order_types,
      department: group.department || '',
      permission_level: group.permission_level || 'view'
    });
    setShowCreateModal(true);
  };

  // Check if user can manage groups (only managers and system admins)
  const canManageGroups = enhancedUser?.role === 'manager' || enhancedUser?.role === 'system_admin';

  if (!canManageGroups) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('groups.access_denied')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('groups.title')}</h2>
          <p className="text-muted-foreground">
            {t('groups.subtitle', { dealerName })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'groups' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('groups')}
              className="rounded-md"
            >
              <Shield className="h-4 w-4 mr-1" />
              {t('groups.groups')}
            </Button>
            <Button
              variant={viewMode === 'memberships' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('memberships')}
              className="rounded-md"
            >
              <Users className="h-4 w-4 mr-1" />
              {t('groups.memberships')}
            </Button>
            <Button
              variant={viewMode === 'assignments' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('assignments')}
              className="rounded-md"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              {t('groups.assignments')}
            </Button>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'groups' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('groups.manage_groups')}</h3>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('groups.create_group')}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? t('groups.edit_group') : t('groups.create_group')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('groups.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('groups.name_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="slug">{t('groups.slug')}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder={t('groups.slug_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="department">{t('groups.department')} *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('groups.select_department')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="permission_level">{t('groups.permission_level')} *</Label>
                <Select value={formData.permission_level} onValueChange={(value) => setFormData(prev => ({ ...prev, permission_level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('groups.select_permission_level')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_LEVEL_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">{t('groups.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('groups.description_placeholder')}
                />
              </div>

              <div>
                <Label>{t('groups.allowed_modules')} *</Label>
                <div className="space-y-3 mt-2">
                  {ORDER_TYPE_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={option.value}
                        checked={formData.allowed_order_types.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleOrderTypeToggle(option.value, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium">
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGroup(null);
                    setFormData({ name: '', slug: '', description: '', allowed_order_types: [], department: '', permission_level: 'view' });
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveGroup}>
                  {editingGroup ? t('common.update') : t('common.create')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('groups.existing_groups')} ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('groups.no_groups_found')}</p>
              <p className="text-sm text-muted-foreground">{t('groups.create_first_group')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('groups.name')}</TableHead>
                  <TableHead>{t('groups.department')}</TableHead>
                  <TableHead>{t('groups.allowed_modules')}</TableHead>
                  <TableHead>{t('groups.permission_level')}</TableHead>
                  <TableHead>{t('groups.members')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(group => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {group.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.allowed_order_types.map(orderType => (
                          <Badge key={orderType} variant="outline" className="text-xs">
                            {ORDER_TYPE_OPTIONS.find(opt => opt.value === orderType)?.label || orderType}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {group.permission_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">0 {t('groups.members')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </div>
      )}

      {/* Membership Management View */}
      {viewMode === 'memberships' && (
        <GroupMembershipManagement
          dealerId={dealerId}
          dealerName={dealerName}
        />
      )}

      {/* User Assignment View */}
      {viewMode === 'assignments' && (
        <UserGroupAssignment
          dealerId={dealerId}
          dealerName={dealerName}
        />
      )}
    </div>
  );
};