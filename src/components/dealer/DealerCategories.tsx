import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Tag, Palette, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { canViewPricing } from '@/utils/permissions';

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  is_system_category: boolean;
  dealer_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryModuleMapping {
  id: string;
  category_id: string;
  module: string;
  dealer_id: number | null;
  is_active: boolean;
}

interface DealerCategoriesProps {
  dealerId: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
];

const MODULE_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'sales_orders', label: 'Sales Orders' },
  { value: 'service_orders', label: 'Service Orders' },
  { value: 'recon_orders', label: 'Recon Orders' },
  { value: 'car_wash', label: 'Car Wash' },
  { value: 'reports', label: 'Reports' }
] as const;

export function DealerCategories({ dealerId }: DealerCategoriesProps) {
  const { t } = useTranslation();
  const { roles } = usePermissions();
  const canManageCategories = canViewPricing(roles);
  
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [mappings, setMappings] = useState<CategoryModuleMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    icon: '',
    modules: [] as string[]
  });

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .or(`is_system_category.eq.true,dealer_id.eq.${dealerId}`)
        .eq('is_active', true)
        .order('is_system_category', { ascending: false })
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(t('categories.error_fetching'));
    }
  };

  const fetchMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('category_module_mappings')
        .select('*')
        .or(`dealer_id.is.null,dealer_id.eq.${dealerId}`)
        .eq('is_active', true);

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchMappings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [dealerId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      icon: '',
      modules: []
    });
    setEditingCategory(null);
  };

  const openEditModal = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || '',
      modules: mappings
        .filter(m => m.category_id === category.id)
        .map(m => m.module)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageCategories) {
      toast.error(t('categories.insufficient_permissions'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('categories.name_required'));
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category (only custom categories can be edited)
        if (editingCategory.is_system_category) {
          toast.error(t('categories.cannot_edit_system'));
          return;
        }

        const { error: updateError } = await supabase
          .from('service_categories')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon || null
          })
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;

        // Update module mappings
        await updateCategoryMappings(editingCategory.id, formData.modules);

        toast.success(t('categories.updated_successfully'));
      } else {
        // Create new category
        const { data: newCategory, error: insertError } = await supabase
          .from('service_categories')
          .insert({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon || null,
            dealer_id: parseInt(dealerId),
            is_system_category: false
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Create module mappings
        await updateCategoryMappings(newCategory.id, formData.modules);

        toast.success(t('categories.created_successfully'));
      }

      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(t('categories.error_saving'));
    }
  };

  const updateCategoryMappings = async (categoryId: string, moduleNames: string[]) => {
    // Delete existing mappings for this category
    await supabase
      .from('category_module_mappings')
      .delete()
      .eq('category_id', categoryId)
      .eq('dealer_id', parseInt(dealerId));

    // Insert new mappings
    if (moduleNames.length > 0) {
      const mappingsToInsert = moduleNames.map(module => ({
        category_id: categoryId,
        module: module as any,
        dealer_id: parseInt(dealerId)
      }));

      const { error } = await supabase
        .from('category_module_mappings')
        .insert(mappingsToInsert);

      if (error) throw error;
    }
  };

  const handleDelete = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.is_system_category) {
      toast.error(t('categories.cannot_delete_system'));
      return;
    }

    if (!canManageCategories) {
      toast.error(t('categories.insufficient_permissions'));
      return;
    }

    try {
      // Soft delete the category
      const { error } = await supabase
        .from('service_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;

      toast.success(t('categories.deleted_successfully'));
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('categories.error_deleting'));
    }
  };

  const getCategoryModules = (categoryId: string) => {
    return mappings
      .filter(m => m.category_id === categoryId)
      .map(m => m.module);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('categories.title')}</h2>
          <p className="text-muted-foreground">{t('categories.description')}</p>
        </div>
        {canManageCategories && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="lg" className="bg-primary hover:bg-primary/90">
                <Plus className="h-5 w-5 mr-2" />
                {t('categories.add_category')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? t('categories.edit_category') : t('categories.add_category')}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('categories.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('categories.name_placeholder')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">{t('categories.color')}</Label>
                    <div className="flex space-x-2">
                      <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                        <SelectTrigger className="w-full">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color }} />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_COLORS.map((color) => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                                <span>{color}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('categories.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('categories.description_placeholder')}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">{t('categories.icon')}</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder={t('categories.icon_placeholder')}
                  />
                </div>

                <div className="space-y-4">
                  <Label>{t('categories.available_modules')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {MODULE_OPTIONS.map((module) => (
                      <div key={module.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={module.value}
                          checked={formData.modules.includes(module.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                modules: [...formData.modules, module.value]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                modules: formData.modules.filter(m => m !== module.value)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={module.value}>{module.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingCategory ? t('common.update') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder={t('categories.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Categories Grid or Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('categories.no_categories_found')}</h3>
          <p className="text-muted-foreground mb-6">{t('categories.no_categories_description')}</p>
          {canManageCategories && (
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('categories.add_category')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => {
          const categoryModules = getCategoryModules(category.id);
          
          return (
            <Card key={category.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm" 
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.name}
                        {category.is_system_category && (
                          <Badge variant="secondary" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            {t('categories.system')}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  {canManageCategories && !category.is_system_category && (
                    <div className="flex space-x-1 opacity-70 hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(category)}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        <Edit2 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.description && (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t('categories.available_in_modules')}
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {categoryModules.length > 0 ? (
                      categoryModules.map((module) => (
                        <Badge key={module} variant="outline" className="text-xs">
                          {MODULE_OPTIONS.find(m => m.value === module)?.label || module}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t('categories.no_modules_assigned')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {t('categories.created_at', { 
                    date: new Date(category.created_at).toLocaleDateString() 
                  })}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">{t('categories.no_categories_found')}</h3>
            <p className="text-muted-foreground">{t('categories.no_categories_description')}</p>
            {canManageCategories && (
              <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('categories.add_first_category')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}