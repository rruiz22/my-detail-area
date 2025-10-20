import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useStockManagement, VehicleInventory } from '@/hooks/useStockManagement';
import { useServerExport } from '@/hooks/useServerExport';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import {
    Car,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    MoreHorizontal,
    Search
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VehicleDetailsModal } from './VehicleDetailsModal';

interface StockInventoryTableProps {
  dealerId?: number;
}

const ITEMS_PER_PAGE = 25;

export const StockInventoryTable: React.FC<StockInventoryTableProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { inventory, loading } = useStockManagement(dealerId);
  const { exportToExcel, exportToCSV, isExporting } = useServerExport({ reportType: 'stock_inventory' });
  const [searchTerm, setSearchTerm] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInventory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleVehicleClick = (vehicle: VehicleInventory) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  // Export functions
  const formatInventoryForExport = (vehicles: VehicleInventory[]) => {
    return vehicles.map((vehicle, index) => ({
      '#': index + 1,
      'Stock Number': vehicle.stock_number || '',
      'VIN': vehicle.vin || '',
      'Year': vehicle.year || '',
      'Make': vehicle.make || '',
      'Model': vehicle.model || '',
      'Trim': vehicle.trim || '',
      'Mileage': vehicle.mileage || 0,
      'Color': vehicle.color || '',
      'Status': vehicle.dms_status || '',
      'Age (Days)': vehicle.age_days || 0,
      'Price': vehicle.price ? `$${vehicle.price}` : '',
      'MSRP': vehicle.msrp ? `$${vehicle.msrp}` : '',
      'Location': vehicle.lot_location || '',
      'Certified': vehicle.is_certified ? 'Yes' : 'No',
      'Photos': vehicle.photo_count || 0,
      'Leads (7D)': vehicle.leads_last_7_days || 0,
      'Total Leads': vehicle.leads_total || 0,
    }));
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    const formattedData = formatInventoryForExport(filteredInventory);
    const filename = `inventory-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      exportToCSV(formattedData, filename);
    } else {
      await exportToExcel(formattedData, filename);
    }
  };

  // Get unique makes for filter
  const uniqueMakes = useMemo(() => {
    const makes = inventory?.map(item => item.make).filter(Boolean) || [];
    return [...new Set(makes)].sort();
  }, [inventory]);

  // Filter and sort inventory
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    const filtered = inventory.filter(item => {
      const matchesSearch =
        item.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMake = makeFilter === 'all' || item.make === makeFilter;
      const matchesStatus = statusFilter === 'all' || item.dms_status === statusFilter;

      return matchesSearch && matchesMake && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a] || '';
      let bValue = b[sortBy as keyof typeof b] || '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [inventory, searchTerm, makeFilter, statusFilter, sortBy, sortOrder]);

  // Pagination calculations
  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, makeFilter, statusFilter]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'sold':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'pending':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      default:
        return 'bg-muted/10 text-muted-foreground hover:bg-muted/20';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num) return '--';
    return num.toLocaleString();
  };

  const formatAgeDays = (days?: number) => {
    if (!days) return '0 days';
    const milliseconds = days * 24 * 60 * 60 * 1000;
    return formatTimeDuration(milliseconds);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5" />
              <span>{t('stock.inventory.title')}</span>
              <Badge variant="secondary">{totalItems}</Badge>
            </CardTitle>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                {t('showing_range', { start: startIndex + 1, end: endIndex, total: totalItems })}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || totalItems === 0}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? t('common.actions.exporting') : t('common.actions.export')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions.export')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                {t('common.actions.export_csv')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('common.actions.export_excel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('stock.filters.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={makeFilter} onValueChange={setMakeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('stock.filters.make')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.filters.all_makes')}</SelectItem>
                {uniqueMakes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('stock.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.filters.all_statuses')}</SelectItem>
                <SelectItem value="available">{t('stock.status.available')}</SelectItem>
                <SelectItem value="sold">{t('stock.status.sold')}</SelectItem>
                <SelectItem value="pending">{t('stock.status.pending')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="max-h-[600px] overflow-auto">
            <Table data-sticky-header>
              <TableHeader className="sticky top-0 bg-background z-10 after:absolute after:inset-x-0 after:bottom-0 after:border-b">
                <TableRow className="border-b-0">
                  <TableHead className="w-[120px] bg-background">{t('stock.table.stock_number')}</TableHead>
                  <TableHead className="w-[150px] bg-background">{t('stock.table.vin')}</TableHead>
                  <TableHead className="bg-background">{t('stock.table.vehicle')}</TableHead>
                  <TableHead className="text-right bg-background">{t('stock.table.year')}</TableHead>
                  <TableHead className="text-right bg-background">{t('stock.table.mileage')}</TableHead>
                  <TableHead className="text-right bg-background">{t('stock.table.price')}</TableHead>
                  <TableHead className="text-right bg-background">{t('stock.table.age_days')}</TableHead>
                  <TableHead className="bg-background">{t('stock.table.status')}</TableHead>
                  <TableHead className="w-[50px] bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t('common.loading')}...
                    </TableCell>
                  </TableRow>
                ) : paginatedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t('stock.inventory.no_vehicles')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInventory.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleVehicleClick(vehicle)}>
                    <TableCell className="font-mono font-medium">
                      {vehicle.stock_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {vehicle.vin || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                           onClick={() => handleVehicleClick(vehicle)}>
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {vehicle.key_photo_url ? (
                            <img
                              src={vehicle.key_photo_url}
                              alt="Vehicle"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="h-4 w-4 text-muted-foreground"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg></div>';
                              }}
                            />
                          ) : (
                            <Car className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.trim}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{vehicle.year || '--'}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(vehicle.mileage)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(vehicle.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono whitespace-nowrap">
                        {formatAgeDays(vehicle.age_days)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(vehicle.dms_status)}>
                        {vehicle.dms_status || t('stock.status.unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleVehicleClick(vehicle);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('stock.actions.view_details')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <div className="flex-1 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <VehicleDetailsModal
        vehicle={selectedVehicle}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </Card>
  );
};
