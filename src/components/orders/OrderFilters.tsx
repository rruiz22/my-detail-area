import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from '@/hooks/useDetailHubAnalytics';

interface FilterProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function OrderFilters({ filters, onFiltersChange, onClose }: FilterProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useTranslation();

  const handleFilterChange = (key: string, value: any) => {
    // Convert "all" back to empty string for filter logic
    const filterValue = value === "all" ? "" : value;
    onFiltersChange({ ...filters, [key]: filterValue });
  };

  const handleDateRangeChange = (dateRange: DateRange) => {
    onFiltersChange({
      ...filters,
      dateRange: dateRange
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      make: '',
      model: '',
      dateRange: { from: null, to: null }
    });
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t('orders.filters.global_filters')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFilters();
                  }}
                >
                  {t('orders.filters.clear')}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">{t('orders.filters.general_search')}</Label>
                <Input
                  id="search"
                  placeholder={t('orders.filters.search_placeholder')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>{t('orders.filters.status')}</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.filters.all_statuses')} />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover border-border">
                     <SelectItem value="all">{t('orders.filters.all_statuses')}</SelectItem>
                     <SelectItem value="pending">{t('orders.filters.pending')}</SelectItem>
                     <SelectItem value="in_progress">{t('orders.filters.in_progress')}</SelectItem>
                     <SelectItem value="completed">{t('orders.filters.completed')}</SelectItem>
                     <SelectItem value="cancelled">{t('orders.filters.cancelled')}</SelectItem>
                   </SelectContent>
                </Select>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label>{t('orders.filters.client')}</Label>
                <Select
                  value={filters.client || 'all'}
                  onValueChange={(value) => handleFilterChange('client', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.filters.all_clients')} />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover border-border">
                     <SelectItem value="all">{t('orders.filters.all_clients')}</SelectItem>
                     <SelectItem value="client1">Cliente 1</SelectItem>
                     <SelectItem value="client2">Cliente 2</SelectItem>
                   </SelectContent>
                </Select>
              </div>

              {/* Service */}
              <div className="space-y-2">
                <Label>{t('orders.filters.service')}</Label>
                <Select
                  value={filters.service || 'all'}
                  onValueChange={(value) => handleFilterChange('service', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.filters.all_services')} />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover border-border">
                     <SelectItem value="all">{t('orders.filters.all_services')}</SelectItem>
                     <SelectItem value="detail">{t('orders.filters.detail')}</SelectItem>
                     <SelectItem value="wash">{t('orders.filters.wash')}</SelectItem>
                     <SelectItem value="recon">{t('orders.filters.recon')}</SelectItem>
                   </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2 md:col-span-2">
                <Label>{t('orders.filters.date_range')}</Label>
                <DateRangePicker
                  value={filters.dateRange || { from: null, to: null }}
                  onChange={handleDateRangeChange}
                  className="w-full"
                />
              </div>

              {/* Make */}
              <div className="space-y-2">
                <Label>{t('orders.filters.make')}</Label>
                <Select
                  value={filters.make || 'all'}
                  onValueChange={(value) => handleFilterChange('make', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.filters.all_makes')} />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover border-border">
                     <SelectItem value="all">{t('orders.filters.all_makes')}</SelectItem>
                     <SelectItem value="honda">Honda</SelectItem>
                     <SelectItem value="toyota">Toyota</SelectItem>
                     <SelectItem value="ford">Ford</SelectItem>
                     <SelectItem value="chevrolet">Chevrolet</SelectItem>
                   </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>{t('orders.filters.model')}</Label>
                <Select
                  value={filters.model || 'all'}
                  onValueChange={(value) => handleFilterChange('model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.filters.all_models')} />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-popover border-border">
                     <SelectItem value="all">{t('orders.filters.all_models')}</SelectItem>
                     <SelectItem value="accord">Accord</SelectItem>
                     <SelectItem value="camry">Camry</SelectItem>
                     <SelectItem value="f150">F-150</SelectItem>
                   </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('orders.filters.filters_apply_all_tabs')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearFilters}>
                  {t('orders.filters.clear_filters')}
                </Button>
                <Button onClick={onClose}>
                  {t('orders.filters.apply_filters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}