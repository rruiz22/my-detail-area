import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Users2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Building2,
  Star,
  PhoneCall,
  MessageSquare,
  Eye,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { ContactModal } from '@/components/contacts/ContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { ContactsStats } from '@/components/contacts/ContactsStats';
import { ContactsPagination } from '@/components/contacts/ContactsPagination';
import { ContactsTableSkeleton } from '@/components/contacts/ContactsTableSkeleton';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useContacts, Contact } from '@/hooks/useContacts';
import { exportContactsToCSV, exportContactsToExcel } from '@/utils/contactExport';

export default function Contacts() {
  // 🚀 CODE SPLITTING: Load contacts + common namespaces
  const { t } = useTranslation(['contacts', 'common']);
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { dealerships, currentDealership } = useAccessibleDealerships();

  // Use the new hook
  const {
    contacts,
    loading,
    stats,
    pagination,
    sorting,
    filters,
    setFilters,
    setPage,
    setPageSize,
    setSorting,
    fetchContacts,
    deleteContact,
    refreshStats,
  } = useContacts();

  // Local state for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Get current dealership name
  const currentDealershipName = selectedDealerId === 'all'
    ? t('dealerships.all_dealerships')
    : currentDealership?.name || '';

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    await deleteContact(contactToDelete.id);
    setContactToDelete(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleViewDetails = (contact: Contact) => {
    setViewingContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleEditFromDetail = (contact: Contact) => {
    setIsDetailModalOpen(false);
    setViewingContact(null);
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleModalSuccess = () => {
    fetchContacts();
    refreshStats();
    handleModalClose();
  };

  const handleExportCSV = () => {
    exportContactsToCSV(contacts, `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    toast({ description: t('contacts.exported_successfully', 'Contacts exported successfully') });
  };

  const handleExportExcel = () => {
    exportContactsToExcel(contacts, `contacts_${new Date().toISOString().split('T')[0]}.xls`);
    toast({ description: t('contacts.exported_successfully', 'Contacts exported successfully') });
  };

  const handleImportSuccess = () => {
    fetchContacts();
    refreshStats();
  };

  const handleSort = (field: string) => {
    if (sorting.field === field) {
      // Toggle order if same field
      setSorting(field, sorting.order === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for new field
      setSorting(field, 'asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sorting.field !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />;
    }
    return sorting.order === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-2" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-2" />
    );
  };

  const getDisplayName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`.trim();
  };

  const getInitials = (contact: Contact) => {
    return `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
  };

  const getDepartmentBadgeVariant = (department: string) => {
    switch (department) {
      case 'sales': return 'default';
      case 'service': return 'secondary';
      case 'management': return 'outline';
      case 'finance': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users2 className="h-8 w-8 text-secondary" />
              {t('contacts.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('contacts.directory_note', 'Contact directory for dealership team')}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              {currentDealershipName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard module="users" permission="write">
              <Button variant="outline" className="gap-2" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                {t('common.import', 'Import')}
              </Button>
            </PermissionGuard>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('common.export', 'Export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('common.export_csv', 'Export as CSV')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('common.export_excel', 'Export as Excel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" onClick={() => { fetchContacts(); refreshStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <PermissionGuard module="users" permission="write">
              <Button className="gap-2" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                {t('contacts.add_new')}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Stats Cards */}
        <ContactsStats
          total={stats.total}
          active={stats.active}
          inactive={stats.inactive}
          byDepartment={stats.byDepartment}
          loading={loading && contacts.length === 0}
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="pl-9"
                />
              </div>

              <Select value={filters.department} onValueChange={(value) => setFilters({ department: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('contacts.department')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('contacts.all_departments')}</SelectItem>
                  <SelectItem value="sales">{t('contacts.sales')}</SelectItem>
                  <SelectItem value="service">{t('contacts.service')}</SelectItem>
                  <SelectItem value="management">{t('contacts.management')}</SelectItem>
                  <SelectItem value="finance">{t('contacts.finance')}</SelectItem>
                  <SelectItem value="parts">{t('contacts.parts', 'Parts')}</SelectItem>
                  <SelectItem value="other">{t('contacts.other')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => setFilters({ status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('contacts.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('contacts.all_statuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('contacts.active')}</SelectItem>
                  <SelectItem value="inactive">{t('contacts.inactive')}</SelectItem>
                  <SelectItem value="suspended">{t('contacts.suspended')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.isPrimary} onValueChange={(value) => setFilters({ isPrimary: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('contacts.contact_type', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('contacts.all_contacts', 'All Contacts')}</SelectItem>
                  <SelectItem value="true">{t('contacts.primary_only', 'Primary Only')}</SelectItem>
                  <SelectItem value="false">{t('contacts.non_primary', 'Non-Primary')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards View */}
        <div className="block sm:hidden space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">{t('common.loading')}</div>
              </CardContent>
            </Card>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">{t('common.no_data')}</div>
              </CardContent>
            </Card>
          ) : (
            contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.avatar_url} alt={getDisplayName(contact)} />
                          <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{getDisplayName(contact)}</h3>
                            {contact.is_primary && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.position || '-'}</p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.view')}
                          </DropdownMenuItem>
            <PermissionGuard module="management" permission="write">
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <DropdownMenuItem>
                            <PhoneCall className="mr-2 h-4 w-4" />
                            {t('contacts.call')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('contacts.send_email')}
                          </DropdownMenuItem>
            <PermissionGuard module="management" permission="delete">
                            <DropdownMenuItem
                              onClick={() => handleDelete(contact)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {contact.dealership?.name || '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={getDepartmentBadgeVariant(contact.department)}>
                        {t(`contacts.${contact.department}`)}
                      </Badge>
                      {contact.is_primary && (
                        <Badge variant="outline">{t('contacts.primary')}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden sm:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center">
                      {t('contacts.name')}
                      {getSortIcon('first_name')}
                    </div>
                  </TableHead>
                  <TableHead>{t('contacts.contact_info')}</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center">
                      {t('contacts.position')}
                      {getSortIcon('position')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center">
                      {t('contacts.department')}
                      {getSortIcon('department')}
                    </div>
                  </TableHead>
                  <TableHead>{t('dealerships.title')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ContactsTableSkeleton rows={pagination.pageSize} />
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t('common.no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(contact)}
                    >
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar_url} alt={getDisplayName(contact)} />
                          <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{getDisplayName(contact)}</div>
                            <div className="text-sm text-muted-foreground">
                              {contact.preferred_language?.toUpperCase()}
                            </div>
                          </div>
                          {contact.is_primary && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {contact.email}
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {contact.position || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDepartmentBadgeVariant(contact.department)}>
                          {t(`contacts.${contact.department}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {contact.dealership?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view')}
                            </DropdownMenuItem>
              <PermissionGuard module="management" permission="write">
                              <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <DropdownMenuItem>
                              <PhoneCall className="mr-2 h-4 w-4" />
                              {t('contacts.call')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              {t('contacts.send_email')}
                            </DropdownMenuItem>
                            <PermissionGuard module="management" permission="delete">
                              <DropdownMenuItem
                                onClick={() => handleDelete(contact)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!loading && contacts.length > 0 && (
              <ContactsPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </CardContent>
        </Card>

        <ContactModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          contact={editingContact}
          currentDealershipName={currentDealershipName}
        />

        <ContactDetailModal
          contact={viewingContact}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setViewingContact(null);
          }}
          onEdit={handleEditFromDetail}
        />

        <ImportContactsDialog
          open={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onSuccess={handleImportSuccess}
          currentDealershipId={selectedDealerId}
          currentDealershipName={currentDealershipName}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t('contacts.delete_title', { defaultValue: 'Delete Contact?' })}
          description={t('contacts.delete_description', { defaultValue: 'Are you sure you want to delete this contact? This action cannot be undone.' })}
          confirmText={t('common.action_buttons.delete')}
          cancelText={t('common.action_buttons.cancel')}
          onConfirm={confirmDelete}
          variant="destructive"
        />
      </div>
    </>
  );
}
