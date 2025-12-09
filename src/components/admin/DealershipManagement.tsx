import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { DealershipModal } from '@/components/dealerships/DealershipModal';
import { ExportDealershipDataModal } from '@/components/dealerships/ExportDealershipDataModal';
import { MigrateUsersModal } from '@/components/dealerships/MigrateUsersModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDealershipContext } from '@/contexts/DealershipContext';
import {
    Archive,
    Building2,
    Download,
    Edit,
    Eye,
    Filter,
    Mail,
    MoreHorizontal,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    UserCog,
    UserPlus,
    Users
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
  deleted_at?: string | null;
  contact_count?: number;
  user_count?: number;
}

export const DealershipManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshDealerships } = useDealershipContext();

  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState<Dealership | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedDealershipForInvite, setSelectedDealershipForInvite] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [selectedDealershipForAction, setSelectedDealershipForAction] = useState<Dealership | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealershipToDelete, setDealershipToDelete] = useState<Dealership | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [dealershipToRestore, setDealershipToRestore] = useState<Dealership | null>(null);

  const fetchDealerships = useCallback(async () => {
    try {
      setLoading(true);

      // Build the query with filters
      let query = supabase
        .from('dealerships')
        .select('*');

      // Filter deleted dealerships based on toggle
      if (showDeleted) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

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
  }, [search, statusFilter, showDeleted, t, toast]);

  useEffect(() => {
    fetchDealerships();
  }, [fetchDealerships]);

  const handleEditDealership = (dealership: Dealership) => {
    setEditingDealership(dealership);
    setIsModalOpen(true);
  };

  const handleDeleteDealership = (dealership: Dealership) => {
    setDealershipToDelete(dealership);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!dealershipToDelete) return;

    try {
      setLoading(true);
      const userCount = dealershipToDelete.user_count || 0;

      // Step 1: Deactivate all user memberships for this dealership
      if (userCount > 0) {
        const { error: membershipError } = await supabase
          .from('dealer_memberships')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('dealer_id', dealershipToDelete.id)
          .eq('active', true);

        if (membershipError) {
          console.error('Error deactivating memberships:', membershipError);
          throw new Error('Failed to deactivate user memberships');
        }
      }

      // Step 2: Soft delete the dealership
      const { error } = await supabase
        .from('dealerships')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', dealershipToDelete.id);

      if (error) throw error;

      // Step 3: Refresh global dealership context FIRST
      console.log('🔄 Refreshing global dealership context...');
      await refreshDealerships();

      // Small delay to ensure React Query completes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Refresh local table
      await fetchDealerships();

      // Step 5: Show success message with user impact
      const successMessage = userCount > 0
        ? t('dealerships.deleted_successfully_with_user_impact', { count: userCount })
        : t('dealerships.deleted_successfully');

      toast({
        title: t('common.success'),
        description: successMessage
      });

      setDealershipToDelete(null);
    } catch (error) {
      console.error('Error deleting dealership:', error);
      toast({
        title: t('common.error'),
        description: t('dealerships.delete_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDealership = (dealership: Dealership) => {
    setDealershipToRestore(dealership);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!dealershipToRestore) return;

    try {
      setLoading(true);

      // Restore dealership by clearing deleted_at
      const { error } = await supabase
        .from('dealerships')
        .update({ deleted_at: null })
        .eq('id', dealershipToRestore.id);

      if (error) throw error;

      // Refresh global dealership context FIRST
      console.log('🔄 Refreshing global dealership context after restore...');
      await refreshDealerships();

      // Small delay to ensure React Query completes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Refresh local table
      await fetchDealerships();

      toast({
        title: t('common.success'),
        description: t('dealerships.restored_successfully')
      });

      setDealershipToRestore(null);
    } catch (error) {
      console.error('Error restoring dealership:', error);
      toast({
        title: t('common.error'),
        description: t('dealerships.restore_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDealer = (dealership: Dealership) => {
    navigate(`/admin/${dealership.id}`);
  };

  const handleInviteUser = (dealership: Dealership) => {
    setSelectedDealershipForInvite(dealership.id);
    setIsInviteModalOpen(true);
  };

  const handleExportData = (dealership: Dealership) => {
    setSelectedDealershipForAction(dealership);
    setIsExportModalOpen(true);
  };

  const handleMigrateUsers = (dealership: Dealership) => {
    setSelectedDealershipForAction(dealership);
    setIsMigrateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDealership(null);
  };

  const handleModalSuccess = async () => {
    // IMPORTANT: Refresh global context FIRST to invalidate cache and refetch
    await refreshDealerships();

    // Then fetch local dealerships for admin table
    await fetchDealerships();

    handleModalClose();
  };

  const handleModalRefresh = async () => {
    // Refresh data without closing modal (for logo uploads)
    await fetchDealerships();

    // Update editingDealership with fresh data
    if (editingDealership) {
      const { data: freshDealership, error } = await supabase
        .from('dealerships')
        .select('*')
        .eq('id', editingDealership.id)
        .single();

      if (!error && freshDealership) {
        setEditingDealership(freshDealership);
      }
    }
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
      case 'active': return 'success';
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
      <div className="flex justify-end items-center">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('dealerships.add_dealership')}
        </Button>
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
          <div className="flex flex-col gap-4">
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

              <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive' | 'suspended') => setStatusFilter(value)}>
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

            {/* Show Deleted Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-deleted"
                checked={showDeleted}
                onCheckedChange={(checked) => setShowDeleted(checked as boolean)}
              />
              <Label
                htmlFor="show-deleted"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                {t('dealerships.show_deleted')}
              </Label>
            </div>
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
                  <TableRow
                    key={dealership.id}
                    onDoubleClick={() => handleViewDealer(dealership)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={dealership.deleted_at ? 'opacity-50' : ''}>
                            {dealership.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${dealership.deleted_at ? 'opacity-60' : ''}`}>
                              {dealership.name}
                            </span>
                            {dealership.deleted_at && (
                              <Badge variant="destructive" className="text-xs">
                                {t('dealerships.deleted_at')}: {new Date(dealership.deleted_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          {dealership.email && (
                            <div className={`text-sm text-muted-foreground ${dealership.deleted_at ? 'opacity-50' : ''}`}>
                              {dealership.email}
                            </div>
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
                          {!dealership.deleted_at ? (
                            <>
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
                              <DropdownMenuItem onClick={() => handleExportData(dealership)}>
                                <Download className="mr-2 h-4 w-4" />
                                {t('dealerships.export_data')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMigrateUsers(dealership)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                {t('dealerships.migrate_users')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteDealership(dealership)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleExportData(dealership)}>
                                <Download className="mr-2 h-4 w-4" />
                                {t('dealerships.export_data')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRestoreDealership(dealership)}
                                className="text-emerald-600"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('dealerships.restore_dealership')}
                              </DropdownMenuItem>
                            </>
                          )}
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
        onRefresh={handleModalRefresh}
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

      <ExportDealershipDataModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setSelectedDealershipForAction(null);
        }}
        dealership={selectedDealershipForAction ? {
          id: selectedDealershipForAction.id,
          name: selectedDealershipForAction.name
        } : null}
      />

      <MigrateUsersModal
        isOpen={isMigrateModalOpen}
        onClose={() => {
          setIsMigrateModalOpen(false);
          setSelectedDealershipForAction(null);
        }}
        onSuccess={() => {
          fetchDealerships();
        }}
        sourceDealership={selectedDealershipForAction ? {
          id: selectedDealershipForAction.id,
          name: selectedDealershipForAction.name
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('common.delete') + ' ' + (dealershipToDelete?.name || '')}
        description={
          dealershipToDelete && dealershipToDelete.user_count && dealershipToDelete.user_count > 0
            ? t('dealerships.confirm_delete_warning', {
                name: dealershipToDelete.name,
                userCount: dealershipToDelete.user_count
              })
            : t('dealerships.confirm_delete', { name: dealershipToDelete?.name || '' })
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title={t('dealerships.restore_dealership')}
        description={t('dealerships.confirm_restore', { name: dealershipToRestore?.name || '' })}
        confirmText={t('common.restore', { defaultValue: 'Restore' })}
        cancelText={t('common.cancel')}
        onConfirm={confirmRestore}
        variant="default"
      />
    </div>
  );
};
