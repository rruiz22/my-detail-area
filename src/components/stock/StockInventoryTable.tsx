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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { useServerExport } from '@/hooks/useServerExport';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import {
    ArrowUpDown,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface StockInventoryTableProps {
  dealerId?: number;
}

const ITEMS_PER_PAGE = 25;

export const StockInventoryTable: React.FC<StockInventoryTableProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { exportToExcel, exportToCSV, isExporting } = useServerExport({ reportType: 'stock_inventory' });
  const [searchParams, setSearchParams] = useSearchParams();

  // Server-side pagination state
  const [inventory, setInventory] = useState<VehicleInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [uniqueMakesData, setUniqueMakesData] = useState<string[]>([]);

  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: 'asc' | 'desc';
  }>({ column: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch inventory from server with pagination
  const fetchInventory = useCallback(async () => {
    if (!dealerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('dealer_vehicle_inventory')
        .select('*', { count: 'exact' })
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`stock_number.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
      }

      // Apply make filter
      if (makeFilter !== 'all') {
        query = query.eq('make', makeFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('dms_status', statusFilter);
      }

      // Apply sorting
      query = query.order(sortConfig.column, { ascending: sortConfig.direction === 'asc' });

      // Apply pagination
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching inventory:', error);
        setInventory([]);
        setTotalCount(0);
      } else {
        setInventory(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [dealerId, currentPage, searchTerm, makeFilter, statusFilter, sortConfig.column, sortConfig.direction]);

  // Fetch unique makes for filter dropdown
  const fetchUniqueMakes = useCallback(async () => {
    if (!dealerId) return;

    try {
      const { data, error } = await supabase
        .from('dealer_vehicle_inventory')
        .select('make')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .not('make', 'is', null);

      if (!error && data) {
        const makes = [...new Set(data.map(item => item.make).filter(Boolean))].sort();
        setUniqueMakesData(makes as string[]);
      }
    } catch (error) {
      console.error('Error fetching unique makes:', error);
    }
  }, [dealerId]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Fetch unique makes only once on mount
  useEffect(() => {
    fetchUniqueMakes();
  }, [fetchUniqueMakes]);

  // Handle ?vehicle=id URL parameter from global search
  useEffect(() => {
    const vehicleId = searchParams.get('vehicle');
    if (vehicleId) {
      // Navigate to vehicle details page
      navigate(`/stock/vehicles/${vehicleId}`);
      // Remove the vehicle param from URL to clean it up
      searchParams.delete('vehicle');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, navigate]);

  const handleVehicleClick = (vehicle: VehicleInventory) => {
    // Navigate to vehicle details page
    navigate(`/stock/vehicles/${vehicle.id}`);
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Export functions (fetch all data for export)
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
    // For export, fetch ALL matching records (not paginated)
    if (!dealerId) return;

    try {
      let query = supabase
        .from('dealer_vehicle_inventory')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      // Apply same filters as current view
      if (searchTerm) {
        query = query.or(`stock_number.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
      }
      if (makeFilter !== 'all') {
        query = query.eq('make', makeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('dms_status', statusFilter);
      }
      query = query.order(sortConfig.column, { ascending: sortConfig.direction === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching data for export:', error);
        return;
      }

      const formattedData = formatInventoryForExport(data || []);
      const filename = `inventory-${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        exportToCSV(formattedData, filename);
      } else {
        await exportToExcel(formattedData, filename);
      }
    } catch (error) {
      console.error('Error exporting inventory:', error);
    }
  };

  // Get unique makes from fetched data
  const uniqueMakes = useMemo(() => {
    return uniqueMakesData;
  }, [uniqueMakesData]);

  // Pagination calculations
  const totalItems = totalCount;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedInventory = inventory; // Already paginated from server

  // Reset to page 1 when filters change (debounced for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timer);
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

  const getStatusRowColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'sold':
        return 'bg-destructive/5 hover:bg-destructive/10';
      case 'available':
        return 'bg-success/5 hover:bg-success/10';
      case 'pending':
        return 'bg-warning/5 hover:bg-warning/10';
      default:
        return 'hover:bg-muted/50';
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search-input">{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search-input"
                placeholder={t('stock.filters.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="make-filter">{t('stock.filters.make')}</Label>
            <Select value={makeFilter} onValueChange={setMakeFilter}>
              <SelectTrigger id="make-filter">
                <SelectValue placeholder={t('stock.filters.make')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.filters.all_makes')}</SelectItem>
                {uniqueMakes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">{t('stock.filters.status')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
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

        {/* Loading State */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-3">
            {paginatedInventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('stock.inventory.no_vehicles')}</p>
              </div>
            ) : (
              paginatedInventory.map(vehicle => (
                <Card
                  key={vehicle.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    getStatusRowColor(vehicle.dms_status)
                  )}
                  onClick={() => handleVehicleClick(vehicle)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={vehicle.key_photo_url || '/images/vehicle-placeholder.png'}
                          alt={vehicle.key_photo_url ? 'Vehicle' : 'Photos Coming Soon'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
                              target.src = '/images/vehicle-placeholder.png';
                            }
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base mb-1">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2 font-mono">
                          {vehicle.stock_number} • {vehicle.vin?.slice(-8)}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-lg">
                            {formatCurrency(vehicle.price)}
                          </div>
                          <Badge className={getStatusColor(vehicle.dms_status)}>
                            {vehicle.dms_status || t('stock.status.unknown')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[600px] overflow-auto">
              <Table data-sticky-header>
                <TableHeader className="sticky top-0 bg-background z-10 after:absolute after:inset-x-0 after:bottom-0 after:border-b">
                  <TableRow className="border-b-0">
                    <TableHead className="bg-background min-w-[300px]">
                      <button
                        onClick={() => handleSort('make')}
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                      >
                        {t('stock.table.vehicle')}
                        {sortConfig.column === 'make' && (
                          <ArrowUpDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig.direction === 'desc' && "rotate-180"
                          )} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="bg-background">
                      {t('stock.table.stock_number')} / {t('stock.table.vin')}
                    </TableHead>
                    <TableHead className="text-right bg-background">
                      <button
                        onClick={() => handleSort('mileage')}
                        className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                      >
                        {t('stock.table.mileage')}
                        {sortConfig.column === 'mileage' && (
                          <ArrowUpDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig.direction === 'desc' && "rotate-180"
                          )} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right bg-background">
                      <button
                        onClick={() => handleSort('price')}
                        className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                      >
                        {t('stock.table.price')}
                        {sortConfig.column === 'price' && (
                          <ArrowUpDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig.direction === 'desc' && "rotate-180"
                          )} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right bg-background">
                      <button
                        onClick={() => handleSort('age_days')}
                        className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                      >
                        {t('stock.table.age_days')}
                        {sortConfig.column === 'age_days' && (
                          <ArrowUpDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig.direction === 'desc' && "rotate-180"
                          )} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="bg-background">{t('stock.table.status')}</TableHead>
                    <TableHead className="w-[50px] bg-background"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Car className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('stock.inventory.no_vehicles')}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInventory.map((vehicle) => (
                      <TableRow
                        key={vehicle.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          getStatusRowColor(vehicle.dms_status)
                        )}
                        onClick={() => handleVehicleClick(vehicle)}
                      >
                        {/* Vehicle with Image */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <img
                                src={vehicle.key_photo_url || '/images/vehicle-placeholder.png'}
                                alt={vehicle.key_photo_url ? 'Vehicle' : 'Photos Coming Soon'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
                                    target.src = '/images/vehicle-placeholder.png';
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-base">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              {vehicle.trim && (
                                <div className="text-sm text-muted-foreground">
                                  {vehicle.trim}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Stock# / VIN */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono font-semibold text-sm">
                              {vehicle.stock_number}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {vehicle.vin?.slice(-8) || 'N/A'}
                            </div>
                          </div>
                        </TableCell>

                        {/* Mileage */}
                        <TableCell className="text-right">
                          {formatNumber(vehicle.mileage)}
                        </TableCell>

                        {/* Price */}
                        <TableCell className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(vehicle.price)}
                          </div>
                          {vehicle.msrp && vehicle.msrp !== vehicle.price && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatCurrency(vehicle.msrp)}
                            </div>
                          )}
                        </TableCell>

                        {/* Age */}
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono whitespace-nowrap">
                            {formatAgeDays(vehicle.age_days)}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.dms_status)}>
                            {vehicle.dms_status || t('stock.status.unknown')}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
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
        )}

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
    </Card>
  );
};
