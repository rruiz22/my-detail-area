import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStockManagement } from '@/hooks/useStockManagement';
import { 
  Search, 
  Filter, 
  Download,
  Eye,
  MoreHorizontal,
  Car,
  DollarSign,
  Calendar,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StockInventoryTableProps {
  dealerId?: number;
}

export const StockInventoryTable: React.FC<StockInventoryTableProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { inventory, loading } = useStockManagement(dealerId);
  const [searchTerm, setSearchTerm] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique makes for filter
  const uniqueMakes = useMemo(() => {
    const makes = inventory?.map(item => item.make).filter(Boolean) || [];
    return [...new Set(makes)].sort();
  }, [inventory]);

  // Filter and sort inventory
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    let filtered = inventory.filter(item => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Car className="w-5 h-5" />
            <span>{t('stock.inventory.title')}</span>
            <Badge variant="secondary">{filteredInventory.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('stock.actions.export')}
          </Button>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t('stock.table.stock_number')}</TableHead>
                <TableHead className="w-[150px]">{t('stock.table.vin')}</TableHead>
                <TableHead>{t('stock.table.vehicle')}</TableHead>
                <TableHead className="text-right">{t('stock.table.year')}</TableHead>
                <TableHead className="text-right">{t('stock.table.mileage')}</TableHead>
                <TableHead className="text-right">{t('stock.table.price')}</TableHead>
                <TableHead className="text-right">{t('stock.table.age_days')}</TableHead>
                <TableHead>{t('stock.table.status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}...
                  </TableCell>
                </TableRow>
              ) : filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('stock.inventory.no_vehicles')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">
                      {vehicle.stock_number}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {vehicle.vin ? vehicle.vin.slice(-8) : '--'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {vehicle.make} {vehicle.model}
                        </div>
                        {vehicle.trim && (
                          <div className="text-sm text-muted-foreground">
                            {vehicle.trim}
                          </div>
                        )}
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
                      <Badge variant="outline">
                        {vehicle.age_days || 0} {t('common.days')}
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
                          <DropdownMenuItem>
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
      </CardContent>
    </Card>
  );
};