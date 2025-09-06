import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FilterProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function OrderFilters({ filters, onFiltersChange, onClose }: FilterProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useTranslation();

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t('filters.global_filters')}
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
                  {t('filters.clear')}
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
                <Label htmlFor="search">{t('filters.general_search')}</Label>
                <Input
                  id="search"
                  placeholder={t('filters.search_placeholder')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>{t('filters.status')}</Label>
                <Select 
                  value={filters.status || ''} 
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.all_statuses')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="">{t('filters.all_statuses')}</SelectItem>
                    <SelectItem value="pending">{t('filters.pending')}</SelectItem>
                    <SelectItem value="in_progress">{t('filters.in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('filters.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('filters.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label>{t('filters.client')}</Label>
                <Select 
                  value={filters.client || ''} 
                  onValueChange={(value) => handleFilterChange('client', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.all_clients')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="">{t('filters.all_clients')}</SelectItem>
                    <SelectItem value="client1">Cliente 1</SelectItem>
                    <SelectItem value="client2">Cliente 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service */}
              <div className="space-y-2">
                <Label>{t('filters.service')}</Label>
                <Select 
                  value={filters.service || ''} 
                  onValueChange={(value) => handleFilterChange('service', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.all_services')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="">{t('filters.all_services')}</SelectItem>
                    <SelectItem value="detail">{t('filters.detail')}</SelectItem>
                    <SelectItem value="wash">{t('filters.wash')}</SelectItem>
                    <SelectItem value="recon">{t('filters.recon')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">{t('filters.date_from')}</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">{t('filters.date_to')}</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              {/* Make */}
              <div className="space-y-2">
                <Label>{t('filters.make')}</Label>
                <Select 
                  value={filters.make || ''} 
                  onValueChange={(value) => handleFilterChange('make', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.all_makes')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="">{t('filters.all_makes')}</SelectItem>
                    <SelectItem value="honda">Honda</SelectItem>
                    <SelectItem value="toyota">Toyota</SelectItem>
                    <SelectItem value="ford">Ford</SelectItem>
                    <SelectItem value="chevrolet">Chevrolet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>{t('filters.model')}</Label>
                <Select 
                  value={filters.model || ''} 
                  onValueChange={(value) => handleFilterChange('model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.all_models')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="">{t('filters.all_models')}</SelectItem>
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
                {t('filters.filters_apply_all_tabs')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearFilters}>
                  {t('filters.clear_filters')}
                </Button>
                <Button onClick={onClose}>
                  {t('filters.apply_filters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}