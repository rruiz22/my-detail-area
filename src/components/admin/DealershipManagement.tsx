import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DealershipModal } from '@/components/dealerships/DealershipModal';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
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
  Eye,
  Mail,
  BarChart3
} from 'lucide-react';

interface Dealership {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  created_at: string;
  updated_at: string;
  contact_count?: number;
  user_count?: number;
}

export const DealershipManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState<Dealership | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedDealershipForInvite, setSelectedDealershipForInvite] = useState<number | null>(null);

  const fetchDealerships = useCallback(async () => {
    try {
      setLoading(true);

      // Build the query with filters
      let query = supabase
        .from('dealerships')
        .select('*')
        .is('deleted_at', null);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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
              .select('id', { count: 'exact', head: true })
              .eq('dealership_id', dealership.id)
              .is('deleted_at', null),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('dealership_id', dealership.id)
          ]);

          return {
            ...dealership,
            contact_count: contactsResult.count || 0,
            user_count: usersResult.count || 0
          };
        })
      );

      setDealerships(dealershipsWithCounts);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
      toast({
        title: t('common.error'),
        description: t('dealerships.fetch_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t, toast]);

  useEffect(() => {
    fetchDealerships();
  }, [fetchDealerships]);

  const handleEditDealership = (dealership: Dealership) => {
    setEditingDealership(dealership);
    setIsModalOpen(true);
  };

  const handleDeleteDealership = async (dealership: Dealership) => {
    if (!confirm(t('dealerships.confirm_delete', { name: dealership.name }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dealerships')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', dealership.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('dealerships.deleted_successfully')
      });

      fetchDealerships();
    } catch (error) {
      console.error('Error deleting dealership:', error);
      toast({
        title: t('common.error'),
        description: t('dealerships.delete_error'),
        variant: 'destructive'
      });
    }
  };

  const handleViewDealer = (dealership: Dealership) => {
    navigate(`/dealers/${dealership.id}`);
  };

  const handleInviteUser = (dealership: Dealership) => {
    setSelectedDealershipForInvite(dealership.id);
    setIsInviteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDealership(null);
  };

  const handleModalSuccess = () => {
    fetchDealerships();
    handleModalClose();
  };

  const handleInvitationSent = () => {
    toast({
      title: t('common.success'),
      description: t('dealerships.invitation_sent')
    });
    fetchDealerships();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'basic': return 'outline';
      case 'premium': return 'secondary';
      case 'enterprise': return 'default';
      default: return 'outline';
    }
  };

  const filteredDealerships = dealerships.filter(dealership => {
    const matchesSearch = search === '' ||
      dealership.name.toLowerCase().includes(search.toLowerCase()) ||
      dealership.email?.toLowerCase().includes(search.toLowerCase()) ||
      dealership.city?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || dealership.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('dealerships.manage_dealerships')}</h2>
          <p className="text-muted-foreground">{t('dealerships.manage_description')}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('dealerships.add_dealership')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('dealerships.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('dealerships.search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('dealerships.status_filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dealerships.all_statuses')}</SelectItem>
                <SelectItem value="active">{t('dealerships.active')}</SelectItem>
                <SelectItem value="inactive">{t('dealerships.inactive')}</SelectItem>
                <SelectItem value="suspended">{t('dealerships.suspended')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dealerships Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('dealerships.dealership_list')} ({filteredDealerships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dealerships.dealership')}</TableHead>
                  <TableHead>{t('dealerships.location')}</TableHead>
                  <TableHead>{t('dealerships.status')}</TableHead>
                  <TableHead>{t('dealerships.plan')}</TableHead>
                  <TableHead>{t('dealerships.stats')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDealerships.map((dealership) => (
                  <TableRow key={dealership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {dealership.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{dealership.name}</div>
                          {dealership.email && (
                            <div className="text-sm text-muted-foreground">{dealership.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {dealership.city && dealership.state ? (
                          <span>{dealership.city}, {dealership.state}</span>
                        ) : (
                          <span className="text-muted-foreground">{t('dealerships.no_location')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(dealership.status)}>
                        {t(`dealerships.${dealership.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(dealership.subscription_plan)}>
                        {t(`dealerships.${dealership.subscription_plan}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{dealership.user_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{dealership.contact_count || 0}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDealer(dealership)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('dealerships.view_details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditDealership(dealership)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInviteUser(dealership)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            {t('dealerships.invite_user')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteDealership(dealership)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredDealerships.length === 0 && !loading && (
            <div className="py-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? t('dealerships.no_results') : t('dealerships.no_dealerships')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <DealershipModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        dealership={editingDealership}
      />

      <DealerInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setSelectedDealershipForInvite(null);
        }}
        onSuccess={handleInvitationSent}
        dealershipId={selectedDealershipForInvite}
      />
    </div>
  );
};