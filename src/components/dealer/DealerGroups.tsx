import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Shield,
  Users,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DealerGroupsProps {
  dealerId: string;
}

interface DealerGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: any; // Json type from Supabase
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupFormData {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { key: 'orders.read', label: 'View Orders', category: 'Orders' },
  { key: 'orders.create', label: 'Create Orders', category: 'Orders' },
  { key: 'orders.update', label: 'Update Orders', category: 'Orders' },
  { key: 'orders.delete', label: 'Delete Orders', category: 'Orders' },
  { key: 'users.read', label: 'View Users', category: 'Users' },
  { key: 'users.manage', label: 'Manage Users', category: 'Users' },
  { key: 'groups.read', label: 'View Groups', category: 'Groups' },
  { key: 'groups.manage', label: 'Manage Groups', category: 'Groups' },
  { key: 'reports.read', label: 'View Reports', category: 'Reports' },
  { key: 'reports.create', label: 'Create Reports', category: 'Reports' },
  { key: 'settings.read', label: 'View Settings', category: 'Settings' },
  { key: 'settings.manage', label: 'Manage Settings', category: 'Settings' },
];

export const DealerGroups: React.FC<DealerGroupsProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DealerGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    slug: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchGroups();
  }, [dealerId]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_groups')
        .select('*')
        .eq('dealer_id', parseInt(dealerId))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.groups.error_loading_groups'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      permissions: []
    });
    setShowModal(true);
  };

  const handleEditGroup = (group: DealerGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      slug: group.slug,
      description: group.description || '',
      permissions: Array.isArray(group.permissions) ? group.permissions : []
    });
    setShowModal(true);
  };

  const handleDeleteGroup = async (group: DealerGroup) => {
    if (!confirm(t('dealer.groups.confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from('dealer_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('dealer.groups.group_deleted')
      });

      fetchGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.groups.error_deleting_group'),
        variant: 'destructive'
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('dealer_groups')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            permissions: formData.permissions
          })
          .eq('id', editingGroup.id);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('dealer.groups.group_updated')
        });
      } else {
        // Create new group
        const { error } = await supabase
          .from('dealer_groups')
          .insert({
            dealer_id: parseInt(dealerId),
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            permissions: formData.permissions
          });

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('dealer.groups.group_created')
        });
      }

      setShowModal(false);
      fetchGroups();
    } catch (error: any) {
      console.error('Error saving group:', error);
      toast({
        title: t('common.error'),
        description: editingGroup ? t('dealer.groups.error_updating_group') : t('dealer.groups.error_creating_group'),
        variant: 'destructive'
      });
    }
  };

  const groupPermissionsByCategory = () => {
    const categories: Record<string, typeof AVAILABLE_PERMISSIONS> = {};
    
    AVAILABLE_PERMISSIONS.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });

    return categories;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('dealer.groups.title')}</h2>
          <p className="text-muted-foreground">{t('dealer.groups.description')}</p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-2" />
          {t('dealer.groups.create_group')}
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dealer.groups.table.name')}</TableHead>
                <TableHead>{t('dealer.groups.table.slug')}</TableHead>
                <TableHead>{t('dealer.groups.table.description')}</TableHead>
                <TableHead>{t('dealer.groups.table.permissions')}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('dealer.groups.no_groups')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{group.slug}</code>
                    </TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(group.permissions) && group.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteGroup(group)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Group Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? t('dealer.groups.edit_group') : t('dealer.groups.create_group')}
            </DialogTitle>
            <DialogDescription>
              {editingGroup ? t('dealer.groups.edit_group_desc') : t('dealer.groups.create_group_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('dealer.groups.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('dealer.groups.form.name_placeholder')}
                />
              </div>
              <div>
                <Label htmlFor="slug">{t('dealer.groups.form.slug')}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder={t('dealer.groups.form.slug_placeholder')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('dealer.groups.form.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('dealer.groups.form.description_placeholder')}
              />
            </div>

            <div>
              <Label>{t('dealer.groups.form.permissions')}</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {permissions.map((permission) => (
                          <div key={permission.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.key}
                              checked={formData.permissions.includes(permission.key)}
                              onCheckedChange={() => handlePermissionToggle(permission.key)}
                            />
                            <Label htmlFor={permission.key} className="text-sm">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveGroup}>
              {editingGroup ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};