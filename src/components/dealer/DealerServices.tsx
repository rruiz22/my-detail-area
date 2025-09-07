import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Settings, DollarSign, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { canViewPricing } from '@/utils/permissions';

interface DealerService {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category: string;
  duration?: number;
  is_active: boolean;
  assigned_groups: string[];
}

interface DealerGroup {
  id: string;
  name: string;
  slug: string;
}

interface DealerServicesProps {
  dealerId: string;
}

const serviceCategories = [
  'general', 'wash', 'detail', 'protection', 'repair', 'maintenance', 'custom'
];

export const DealerServices: React.FC<DealerServicesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { permissions, roles } = usePermissionContext();
  const [services, setServices] = useState<DealerService[]>([]);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DealerService | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'general',
    duration: '',
    is_active: true,
    assigned_groups: [] as string[]
  });

  const canViewPrices = canViewPricing(roles);
  const canManageServices = permissions.some(p => 
    p.module === 'dealerships' && ['write', 'delete', 'admin'].includes(p.permission_level)
  );

  useEffect(() => {
    fetchServices();
    fetchGroups();
  }, [dealerId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_dealer_services_for_user', { p_dealer_id: parseInt(dealerId) });

      if (error) throw error;
      setServices(data || []);
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
  };

  const fetchGroups = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        category: formData.category,
        duration: formData.duration ? parseInt(formData.duration) : null,
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

  const handleDelete = async (serviceId: string) => {
    if (!confirm(t('services.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('dealer_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: t('services.success'),
        description: t('services.deleted')
      });

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
      category: 'general',
      duration: '',
      is_active: true,
      assigned_groups: []
    });
    setEditingService(null);
  };

  const openEditModal = (service: DealerService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price?.toString() || '',
      category: service.category,
      duration: service.duration?.toString() || '',
      is_active: service.is_active,
      assigned_groups: service.assigned_groups
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-secondary',
      wash: 'bg-blue-100 text-blue-800',
      detail: 'bg-green-100 text-green-800',
      protection: 'bg-purple-100 text-purple-800',
      repair: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('services.title')}</h2>
          <p className="text-muted-foreground">{t('services.subtitle')}</p>
        </div>
        
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
                    <Label htmlFor="category">{t('services.category')}</Label>
                    <Select value={formData.category} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {t(`services.categories.${category}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {canViewPrices && (
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
                  )}
                  
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
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingService ? t('common.update') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={t('services.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('services.allCategories')}</SelectItem>
            {serviceCategories.map(category => (
              <SelectItem key={category} value={category}>
                {t(`services.categories.${category}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => (
          <Card key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{service.name}</CardTitle>
                {canManageServices && (
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDelete(service.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <Badge className={getCategoryBadgeColor(service.category)}>
                {t(`services.categories.${service.category}`)}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
              
              <div className="flex justify-between text-sm">
                {canViewPrices && service.price && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${service.price.toFixed(2)}</span>
                  </div>
                )}
                
                {service.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} {t('services.minutes')}</span>
                  </div>
                )}
              </div>
              
              {service.assigned_groups.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Settings className="h-3 w-3" />
                    <span>{t('services.assignedTo')}:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {service.assigned_groups.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      return group ? (
                        <Badge key={groupId} variant="outline" className="text-xs">
                          {group.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {!service.is_active && (
                <Badge variant="secondary">{t('services.inactive')}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('services.noServices')}</h3>
          <p className="text-muted-foreground mb-4">{t('services.noServicesDescription')}</p>
          {canManageServices && (
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('services.addFirst')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};