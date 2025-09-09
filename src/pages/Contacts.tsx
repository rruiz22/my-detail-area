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
  Users2, 
  Phone, 
  Mail, 
  Edit, 
  Trash2,
  Building2,
  Star,
  PhoneCall,
  MessageSquare,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ContactModal } from '@/components/contacts/ContactModal';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { ContactDepartment, DealershipStatus, LanguageCode } from '@/types/dealership';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  position?: string;
  department: ContactDepartment;
  is_primary: boolean;
  status: DealershipStatus;
  dealership_id: number;
  avatar_url?: string;
  preferred_language: LanguageCode;
  can_receive_notifications: boolean;
  dealership?: {
    name: string;
  };
}

export default function Contacts() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dealershipFilter, setDealershipFilter] = useState<string>('all');
  const [dealerships, setDealerships] = useState<{ id: number; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('dealership_contacts')
        .select(`
          *,
          dealerships!dealership_contacts_dealership_id_fkey(name)
        `)
        .is('deleted_at', null);

      if (departmentFilter !== 'all') {
        query = query.eq('department', departmentFilter as 'other' | 'sales' | 'service' | 'parts' | 'management');
      }

      if (dealershipFilter !== 'all') {
        query = query.eq('dealership_id', parseInt(dealershipFilter));
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,position.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDealerships = async () => {
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setDealerships(data || []);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    }
  };

  useEffect(() => {
    fetchDealerships();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [search, departmentFilter, dealershipFilter]);

  const handleDelete = async (contact: Contact) => {
    if (!confirm(t('messages.confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from('dealership_contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contact.id);

      if (error) throw error;

      toast.success(t('messages.deleted'));
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(t('messages.error'));
    }
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
    handleModalClose();
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
    <DashboardLayout title={t('contacts.title')}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users2 className="h-8 w-8 text-secondary" />
              {t('contacts.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('contacts.manage_description', 'Manage contacts across all dealerships')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact information only - these are not system users
            </p>
          </div>
          <PermissionGuard module="users" permission="write">
            <Button className="gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              {t('contacts.add_new')}
            </Button>
          </PermissionGuard>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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

              <Select value={dealershipFilter} onValueChange={setDealershipFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dealerships.title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('contacts.all_dealerships')}</SelectItem>
                  {dealerships.map((dealership) => (
                    <SelectItem key={dealership.id} value={dealership.id.toString()}>
                      {dealership.name}
                    </SelectItem>
                  ))}
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
                  <TableHead>{t('contacts.name')}</TableHead>
                  <TableHead>{t('contacts.contact_info')}</TableHead>
                  <TableHead>{t('contacts.position')}</TableHead>
                  <TableHead>{t('contacts.department')}</TableHead>
                  <TableHead>{t('dealerships.title')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
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
          </CardContent>
        </Card>
        </div>

      <ContactModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        contact={editingContact}
        dealerships={dealerships}
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
    </DashboardLayout>
  );
}