import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Building2, 
  Users, 
  UserPlus, 
  Edit, 
  Trash2,
  Eye 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dealership, DealershipStatus, SubscriptionPlan } from '@/types/dealership';
import { DealershipModal } from '@/components/dealerships/DealershipModal';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';

export function Dealerships() {
  const { t } = useTranslation();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DealershipStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState<Dealership | null>(null);

  const fetchDealerships = async () => {
    try {
      setLoading(true);
      
      // Build the query with filters
      let query = supabase
        .from('dealerships')
        .select(`
          *,
          dealership_contacts!inner(count),
          detail_users!inner(count)
        `)
        .is('deleted_at', null);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (planFilter !== 'all') {
        query = query.eq('subscription_plan', planFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get counts for contacts and users
      const dealershipsWithCounts = await Promise.all(
        (data || []).map(async (dealership) => {
          const [contactsResult, usersResult] = await Promise.all([
            supabase
              .from('dealership_contacts')
              .select('id', { count: 'exact' })
              .eq('dealership_id', dealership.id)
              .is('deleted_at', null),
            supabase
              .from('detail_users')
              .select('id', { count: 'exact' })
              .eq('dealership_id', dealership.id)
              .is('deleted_at', null)
          ]);

          return {
            ...dealership,
            contacts_count: contactsResult.count || 0,
            users_count: usersResult.count || 0,
          };
        })
      );

      setDealerships(dealershipsWithCounts);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealerships();
  }, [search, statusFilter, planFilter]);

  const handleEdit = (dealership: Dealership) => {
    setEditingDealership(dealership);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingDealership(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (dealership: Dealership) => {
    if (!confirm(t('messages.confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from('dealerships')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', dealership.id);

      if (error) throw error;

      toast.success(t('messages.deleted'));
      fetchDealerships();
    } catch (error) {
      console.error('Error deleting dealership:', error);
      toast.error(t('messages.error'));
    }
  };

  const getStatusBadgeVariant = (status: DealershipStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'basic': return 'outline';
      case 'premium': return 'secondary';
      case 'enterprise': return 'default';
      default: return 'outline';
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDealership(null);
  };

  const handleModalSuccess = () => {
    fetchDealerships();
    handleModalClose();
  };

  return (
    <DashboardLayout title={t('dealerships.title')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dealerships.title')}</h1>
            <p className="text-muted-foreground">
              {t('dealerships.manage_description', 'Manage dealerships, their contacts and users')}
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('dealerships.add_new')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: DealershipStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dealerships.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dealerships.all_statuses', 'All Status')}</SelectItem>
                  <SelectItem value="active">{t('dealerships.active')}</SelectItem>
                  <SelectItem value="inactive">{t('dealerships.inactive')}</SelectItem>
                  <SelectItem value="suspended">{t('dealerships.suspended')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={(value: SubscriptionPlan | 'all') => setPlanFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dealerships.subscription_plan')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dealerships.all_plans', 'All Plans')}</SelectItem>
                  <SelectItem value="basic">{t('dealerships.basic_plan')}</SelectItem>
                  <SelectItem value="premium">{t('dealerships.premium_plan')}</SelectItem>
                  <SelectItem value="enterprise">{t('dealerships.enterprise_plan')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('dealerships.name')}</TableHead>
                  <TableHead>{t('dealerships.location', 'Location')}</TableHead>
                  <TableHead className="text-center">{t('dealerships.contacts_count')}</TableHead>
                  <TableHead className="text-center">{t('dealerships.users_count')}</TableHead>
                  <TableHead>{t('dealerships.subscription_plan')}</TableHead>
                  <TableHead>{t('dealerships.status')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : dealerships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t('common.no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  dealerships.map((dealership) => (
                    <TableRow key={dealership.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={dealership.logo_url} alt={dealership.name} />
                          <AvatarFallback>
                            <Building2 className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dealership.name}</div>
                          <div className="text-sm text-muted-foreground">{dealership.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {dealership.city && dealership.state ? 
                            `${dealership.city}, ${dealership.state}` : 
                            dealership.city || dealership.state || '-'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {dealership.contacts_count || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          {dealership.users_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(dealership.subscription_plan)}>
                          {t(`dealerships.${dealership.subscription_plan}_plan`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(dealership.status)}>
                          {t(`dealerships.${dealership.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(dealership)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(dealership)}>
                              <Trash2 className="mr-2 h-4 w-4" />
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
      </div>

      <DealershipModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        dealership={editingDealership}
      />
    </DashboardLayout>
  );
}