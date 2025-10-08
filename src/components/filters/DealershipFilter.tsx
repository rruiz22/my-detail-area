import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useAuth } from '@/contexts/AuthContext';

export const DealershipFilter = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dealerships, loading } = useAccessibleDealerships();
  const [selectedDealerId, setSelectedDealerId] = useState<number | 'all'>('all');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedDealerFilter');
    if (saved) {
      setSelectedDealerId(saved === 'all' ? 'all' : parseInt(saved));
    }
  }, []);

  // Save to localStorage when changed
  const handleDealerChange = (value: string) => {
    const newValue = value === 'all' ? 'all' : parseInt(value);
    setSelectedDealerId(newValue);
    localStorage.setItem('selectedDealerFilter', value);

    // Trigger custom event for useOrderManagement to listen
    window.dispatchEvent(new CustomEvent('dealerFilterChanged', {
      detail: { dealerId: newValue }
    }));
  };

  // Don't render if loading or no dealerships
  if (loading || dealerships.length === 0) {
    return null;
  }

  // Single dealer user - don't show filter (EXCEPT for system_admin)
  // system_admin should always see the filter to manage multiple dealerships
  if (dealerships.length === 1 && user?.role !== 'system_admin') {
    return null;
  }

  // Multi-dealer user - show filter
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={selectedDealerId.toString()}
        onValueChange={handleDealerChange}
      >
        <SelectTrigger className="w-56 h-8 text-sm whitespace-nowrap">
          <SelectValue placeholder="Select dealership..." className="truncate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2 w-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
              <span className="truncate">{t('dealerships.all_dealerships', 'All Dealerships')}</span>
            </div>
          </SelectItem>
          {dealerships.map((dealer) => (
            <SelectItem key={dealer.id} value={dealer.id.toString()}>
              <div className="flex items-center gap-2 w-full">
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                <span className="truncate" title={dealer.name}>{dealer.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};