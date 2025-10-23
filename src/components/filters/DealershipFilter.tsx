import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DealershipFilter = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dealerships, loading } = useAccessibleDealerships();
  const { selectedDealerId, setSelectedDealerId } = useDealerFilter();

  // Handle dealer change (Context handles localStorage persistence)
  const handleDealerChange = (value: string) => {
    const newValue = value === 'all' ? 'all' : parseInt(value);
    setSelectedDealerId(newValue);

    // Trigger custom event for legacy components that still listen to it
    window.dispatchEvent(new CustomEvent('dealerFilterChanged', {
      detail: { dealerId: newValue }
    }));
  };

  // Don't render if loading or no dealerships
  if (loading || dealerships.length === 0) {
    return null;
  }

  // Get current dealer name for display
  const getCurrentDealerName = () => {
    if (selectedDealerId === 'all') {
      return t('dealerships.all_selected');
    }
    const currentDealer = dealerships.find(d => d.id === selectedDealerId);
    return currentDealer?.name || t('dealerships.none_selected');
  };

  // Single dealer user - show ONLY informative badge (no dropdown)
  if (dealerships.length === 1 && user?.role !== 'system_admin') {
    return (
      <Badge variant="outline" className="gap-2 px-3 py-1 rounded-sm">
        <Building2 className="h-3 w-3" />
        <span className="font-medium text-xs">{dealerships[0].name}</span>
      </Badge>
    );
  }

  // Multi-dealer user or system_admin - show filter with badge + dropdown
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Badge variant="outline" className="gap-2 px-3 py-1 hidden lg:flex rounded-sm">
        <Building2 className="h-3 w-3" />
        <span className="font-medium text-xs">{getCurrentDealerName()}</span>
      </Badge>
      <Select
        value={selectedDealerId.toString()}
        onValueChange={handleDealerChange}
      >
        <SelectTrigger className="w-56 lg:w-48 h-8 text-sm whitespace-nowrap">
          <div className="flex items-center gap-2 w-full">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 lg:hidden" />
            <SelectValue placeholder={t('dealerships.dealership')} className="truncate" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2 w-full">
              <div className="w-2 h-2 bg-gray-500 rounded-full shrink-0" />
              <span className="truncate">{t('dealerships.all_dealerships')}</span>
            </div>
          </SelectItem>
          {dealerships.map((dealer) => (
            <SelectItem key={dealer.id} value={dealer.id.toString()}>
              <div className="flex items-center gap-2 w-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                <span className="truncate" title={dealer.name}>{dealer.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
