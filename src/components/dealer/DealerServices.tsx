import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { canViewPricing } from '@/utils/permissions';
import { ChevronDown, ChevronRight, Clock, Edit, Plus, Tag, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealerService {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category_id?: string;  // This field exists in DB but not in generated types
  category_name: string;
  category_color: string;
  color?: string;
  duration?: number;
  is_active: boolean;
  assigned_groups: string[];
}

// Extended type that includes category_id from the RPC
interface DealerServiceWithCategory extends DealerService {
  category_id: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  is_system_category: boolean;
  color: string;
  icon?: string;
}

interface DealerGroup {
  id: string;
  name: string;
  slug: string;
}

interface DealerServicesProps {
  dealerId: string;
}

// Remove hardcoded categories - will fetch from database

export const DealerServices: React.FC<DealerServicesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { permissions, roles, enhancedUser } = usePermissions();
  const [services, setServices] = useState<DealerService[]>([]);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DealerService | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    duration: '',
    color: '#6B7280',
    is_active: true,
    assigned_groups: [] as string[]
  });

  const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);
  // System admins can always manage services, otherwise check permissions
  const canManageServices = enhancedUser?.is_system_admin ||
    (permissions?.some(p =>
      p.module === 'dealerships' && ['write', 'delete', 'admin'].includes(p.permission_level)
    ) ?? false);

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealerId) });

      if (error) throw error;

      // Type assertion because Supabase generated types are outdated (missing category_id)
      setServices((data as unknown as DealerService[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: t('services.error'),
        description: t('services.fetchError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_groups')
        .select('id, name, slug')
        .eq('dealer_id', parseInt(dealerId))
        .eq('is_active', true);

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }, [dealerId]);

  const fetchCategories = useCallback(async () => {
    try {
      // Fetch categories available for all modules (for services management)
      // For now, just fetch global categories (dealer_id IS NULL) which are available to all dealerships
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, description, is_system_category, color, icon')
        .eq('is_active', true)
        .is('dealer_id', null)
        .order('name');

      if (error) throw error;

      setCategories(data || []);

    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchGroups();
    fetchCategories();
  }, [dealerId, fetchServices, fetchGroups, fetchCategories]);

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !formData.category_id) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, formData.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: category_id is required
    if (!formData.category_id) {
      toast({
        title: t('services.error'),
        description: t('services.categoryRequired', 'Category selection is required'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        category_id: formData.category_id,
        duration: formData.duration ? parseInt(formData.duration) : null,
        color: formData.color || '#6B7280',
        is_active: formData.is_active,
        dealer_id: parseInt(dealerId)
      };

      let serviceId: string;

      if (editingService) {
        const { error } = await supabase
          .from('dealer_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        serviceId = editingService.id;
      } else {
        const { data, error } = await supabase
          .from('dealer_services')
          .insert([serviceData])
          .select('id')
          .single();

        if (error) throw error;
        serviceId = data.id;
      }

      // Update group assignments
      await supabase
        .from('dealer_service_groups')
        .delete()
        .eq('service_id', serviceId);

      if (formData.assigned_groups.length > 0) {
        const groupAssignments = formData.assigned_groups.map(groupId => ({
          service_id: serviceId,
          group_id: groupId
        }));

        const { error } = await supabase
          .from('dealer_service_groups')
          .insert(groupAssignments);

        if (error) throw error;
      }

      toast({
        title: t('services.success'),
        description: editingService ? t('services.updated') : t('services.created')
      });

      resetForm();
      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: t('services.error'),
        description: t('services.saveError'),
        variant: 'destructive'
      });
    }
  };

  const handleDelete = (serviceId: string) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      const { error } = await supabase
        .from('dealer_services')
        .delete()
        .eq('id', serviceToDelete);

      if (error) throw error;

      toast({
        title: t('services.success'),
        description: t('services.deleted')
      });

      setServiceToDelete(null);
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: t('services.error'),
        description: t('services.deleteError'),
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      duration: '',
      color: '#6B7280',
      is_active: true,
      assigned_groups: []
    });
    setEditingService(null);
  };

  const openEditModal = (service: DealerService) => {
    setEditingService(service);

    // Ensure category_id is properly set
    const categoryId = service.category_id || categories[0]?.id || '';

    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price?.toString() || '',
      category_id: categoryId,
      duration: service.duration?.toString() || '',
      color: service.color || service.category_color || '#6B7280',
      is_active: service.is_active,
      assigned_groups: service.assigned_groups
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || service.category_name.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Group services by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    const categoryName = service.category_name;
    if (!acc[categoryName]) {
      acc[categoryName] = {
        color: service.category_color,
        services: []
      };
    }
    acc[categoryName].services.push(service);
    return acc;
  }, {} as Record<string, { color: string; services: DealerService[] }>);

  // Initialize all categories as open on first load
  useEffect(() => {
    if (Object.keys(groupedServices).length > 0 && Object.keys(openCategories).length === 0) {
      const initialState: Record<string, boolean> = {};
      Object.keys(groupedServices).forEach(categoryName => {
        initialState[categoryName] = true;
      });
      setOpenCategories(initialState);
    }
  }, [groupedServices, openCategories]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const getCategoryBadgeStyle = (color: string) => {
    return {
      backgroundColor: color + '20', // Add transparency
      color: color,
      border: `1px solid ${color}40`
    };
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        {canManageServices && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t('services.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? t('services.edit') : t('services.add')}
                </DialogTitle>
                <DialogDescription>
                  {editingService ? t('services.editDescription') : t('services.addDescription')}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('services.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">{t('services.department')} *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                      disabled={categories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          categories.length === 0
                            ? t('services.noCategoriesAvailable', 'No categories available')
                            : t('services.selectDepartment')
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="none" disabled>
                            {t('services.noCategoriesFound', 'No categories found')}
                          </SelectItem>
                        ) : (
                          categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {t('services.noCategoriesWarning', 'No service categories available. Please contact system administrator.')}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">{t('services.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">{t('services.price')}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">{t('services.duration')}</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder={t('services.durationPlaceholder')}
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Badge Color Picker */}
                <div>
                  <Label htmlFor="color">{t('services.color')}</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="color"
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Badge style={{
                      backgroundColor: formData.color + '20',
                      color: formData.color,
                      border: `1px solid ${formData.color}40`
                    }}>
                      {formData.name || t('services.colorPreview')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a color for this service's badge in orders
                  </p>
                </div>

                <div>
                  <Label>{t('services.assignGroups')}</Label>
                  <div className="space-y-2 mt-2">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={group.id}
                          checked={formData.assigned_groups.includes(group.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                assigned_groups: [...prev.assigned_groups, group.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assigned_groups: prev.assigned_groups.filter(id => id !== group.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={group.id}>{group.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, is_active: !!checked }))
                    }
                  />
                  <Label htmlFor="is_active">{t('services.active')}</Label>
                </div>

                <Separator />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    {t('common.action_buttons.cancel')}
                  </Button>
                  <Button type="submit" disabled={categories.length === 0}>
                    {editingService ? t('common.action_buttons.update') : t('common.action_buttons.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('services.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-52 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('services.allCategories')}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.name} value={category.name}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services Table Grouped by Category */}
      <div className="space-y-4">
        {Object.entries(groupedServices).map(([categoryName, { color, services }]) => (
          <Card key={categoryName} className="card-enhanced overflow-hidden">
            <Collapsible
              open={openCategories[categoryName] ?? true}
              onOpenChange={() => toggleCategory(categoryName)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-gray-50 transition-colors cursor-pointer py-3 px-4">
                  <div className="flex items-center gap-3">
                    {openCategories[categoryName] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <CardTitle className="text-base font-semibold">{categoryName}</CardTitle>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {services.length}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[25%] h-9 text-xs font-semibold">{t('services.name')}</TableHead>
                        <TableHead className="w-[30%] h-9 text-xs font-semibold">{t('services.description')}</TableHead>
                        {canViewPrices && (
                          <TableHead className="w-[12%] h-9 text-xs font-semibold text-center">{t('services.price')}</TableHead>
                        )}
                        <TableHead className="w-[13%] h-9 text-xs font-semibold text-center">{t('services.duration')}</TableHead>
                        <TableHead className="w-[12%] h-9 text-xs font-semibold text-center">{t('services.status', 'Status')}</TableHead>
                        {canManageServices && (
                          <TableHead className="w-[8%] h-9 text-xs font-semibold text-right">{t('common.actions')}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map(service => (
                        <TableRow
                          key={service.id}
                          className={`${!service.is_active ? 'opacity-50' : ''} hover:bg-gray-50`}
                        >
                          <TableCell className="py-2 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{service.name}</span>
                              {service.assigned_groups.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {service.assigned_groups.map(groupId => {
                                    const group = groups.find(g => g.id === groupId);
                                    return group ? (
                                      <Badge key={groupId} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                        {group.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="py-2 px-4 text-xs text-muted-foreground max-w-xs truncate"
                            title={service.description || ''}
                          >
                            {service.description || '—'}
                          </TableCell>
                          {canViewPrices && (
                            <TableCell className="py-2 px-4 text-center text-sm font-medium">
                              {service.price ? `$${service.price.toFixed(2)}` : '—'}
                            </TableCell>
                          )}
                          <TableCell className="py-2 px-4 text-center text-xs">
                            {service.duration ? (
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{service.duration}m</span>
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-2 px-4 text-center">
                            <Badge
                              variant={service.is_active ? "default" : "secondary"}
                              className="text-[10px] px-2 py-0 h-5"
                            >
                              {service.is_active ? t('services.active') : t('services.inactive')}
                            </Badge>
                          </TableCell>
                          {canManageServices && (
                            <TableCell className="py-2 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(service);
                                  }}
                                  className="h-8 w-8 p-0 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  title={t('services.edit')}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">{t('services.edit')}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(service.id);
                                  }}
                                  className="h-8 w-8 p-0 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title={t('common.action_buttons.delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">{t('common.action_buttons.delete')}</span>
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <Card className="card-enhanced">
          <CardContent className="text-center py-12">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">{t('services.noServices')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('services.noServicesDescription')}</p>
            {canManageServices && (
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('services.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog - Team Chat Style */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('services.confirm_delete_title', 'Delete Service?')}
        description={t('services.confirmDelete', 'Are you sure you want to delete this service? This action cannot be undone.')}
        confirmText={t('common.action_buttons.delete', 'Delete')}
        cancelText={t('common.action_buttons.cancel', 'Cancel')}
        onConfirm={confirmDeleteService}
        variant="destructive"
      />
    </div>
  );
};
