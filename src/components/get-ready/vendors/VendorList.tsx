import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Search,
  Star,
  CheckCircle2,
  XCircle,
  DollarSign,
  Briefcase,
  Phone,
  Mail
} from 'lucide-react';
import { useVendorsWithStats, useDeleteVendor, useToggleVendorStatus } from '@/hooks/useVendors';
import { VendorFormModal } from './VendorFormModal';
import type { Vendor, VendorWithStats } from '@/types/getReady';
import { cn } from '@/lib/utils';

export function VendorList() {
  const { t } = useTranslation();
  const { data: vendors = [], isLoading } = useVendorsWithStats();
  const deleteVendor = useDeleteVendor();
  const toggleStatus = useToggleVendorStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showFormModal, setShowFormModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedVendor(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDelete = (vendorId: string) => {
    setVendorToDelete(vendorId);
  };

  const confirmDelete = async () => {
    if (vendorToDelete) {
      await deleteVendor.mutateAsync(vendorToDelete);
      setVendorToDelete(null);
    }
  };

  const handleToggleStatus = async (vendor: VendorWithStats) => {
    await toggleStatus.mutateAsync({
      id: vendor.id,
      is_active: !vendor.is_active
    });
  };

  // Filter vendors based on search
  const filteredVendors = vendors.filter(vendor => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(query) ||
      vendor.specialties.some(s => s.toLowerCase().includes(query)) ||
      vendor.contact_info?.contact_person?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t('get_ready.vendors.title')}
            </CardTitle>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('get_ready.vendors.add_vendor')}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('get_ready.vendors.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Vendors Table */}
          {filteredVendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchQuery
                  ? t('get_ready.vendors.no_vendors_found')
                  : t('get_ready.vendors.no_vendors_yet')}
              </p>
              <p className="text-sm mb-4">
                {searchQuery
                  ? t('get_ready.vendors.try_different_search')
                  : t('get_ready.vendors.create_first_vendor')}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNew} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('get_ready.vendors.add_vendor')}
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('get_ready.vendors.vendor_name')}</TableHead>
                    <TableHead>{t('get_ready.vendors.specialties')}</TableHead>
                    <TableHead>{t('get_ready.vendors.contact')}</TableHead>
                    <TableHead className="text-right">{t('get_ready.vendors.active_jobs')}</TableHead>
                    <TableHead className="text-right">{t('get_ready.vendors.completed')}</TableHead>
                    <TableHead className="text-center">{t('get_ready.vendors.status')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} className={cn(!vendor.is_active && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{vendor.name}</div>
                            {vendor.performance_rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{vendor.performance_rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vendor.specialties.slice(0, 3).map((specialty) => (
                            <Badge key={specialty} variant="secondary" className="text-xs">
                              {specialty.replace('_', ' ')}
                            </Badge>
                          ))}
                          {vendor.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{vendor.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {vendor.contact_info?.contact_person && (
                            <div className="text-muted-foreground">
                              {vendor.contact_info.contact_person}
                            </div>
                          )}
                          {vendor.contact_info?.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {vendor.contact_info.phone}
                            </div>
                          )}
                          {vendor.contact_info?.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {vendor.contact_info.email}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">
                          {vendor.active_jobs}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-muted-foreground">
                          {vendor.completed_jobs}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        {vendor.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('get_ready.vendors.active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {t('get_ready.vendors.inactive')}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(vendor)}>
                              {vendor.is_active ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t('get_ready.vendors.deactivate')}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('get_ready.vendors.activate')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(vendor.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <VendorFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        vendor={selectedVendor}
        mode={formMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!vendorToDelete} onOpenChange={() => setVendorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('get_ready.vendors.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('get_ready.vendors.confirm_delete_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
