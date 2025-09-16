import { useState, useEffect } from 'react';
import { useAccessibleDealerships } from './useAccessibleDealerships';

interface StockEnabledDealer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  website: string;
  status: string;
  subscription_plan: string;
}

interface UseStockDealerSelectionReturn {
  stockDealerships: StockEnabledDealer[];
  selectedDealerId: number | null;
  setSelectedDealerId: (dealerId: number) => void;
  loading: boolean;
  refreshDealerships: () => void;
}

export const useStockDealerSelection = (): UseStockDealerSelectionReturn => {
  const { dealerships, loading: dealershipsLoading, refreshDealerships } = useAccessibleDealerships();
  const [stockDealerships, setStockDealerships] = useState<StockEnabledDealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter dealers and auto-select first one
  useEffect(() => {
    if (dealershipsLoading || !dealerships.length) return;
    
    // Simple filter for stock-enabled dealers (assuming all have access for now)
    const stockEnabled = dealerships.filter(dealer => dealer.status === 'active');
    setStockDealerships(stockEnabled);
    
    // Auto-select first dealer if available and none is currently selected
    if (stockEnabled.length > 0 && selectedDealerId === null) {
      setSelectedDealerId(stockEnabled[0].id);
    }
    
    setLoading(false);
  }, [dealerships, dealershipsLoading, selectedDealerId]);

  return {
    stockDealerships,
    selectedDealerId,
    setSelectedDealerId,
    loading: dealershipsLoading || loading,
    refreshDealerships
  };
};