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
  const { dealerships, loading: dealershipsLoading, filterByModule, refreshDealerships } = useAccessibleDealerships();
  const [stockDealerships, setStockDealerships] = useState<StockEnabledDealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter and auto-select first dealer
  useEffect(() => {
    if (dealershipsLoading || !dealerships.length) return;
    
    let isCancelled = false;
    
    const processStockDealerships = async () => {
      try {
        setLoading(true);
        const stockEnabled = await filterByModule('stock');
        
        if (isCancelled) return;
        
        setStockDealerships(stockEnabled);
        
        // Auto-select first dealer if available and none selected
        if (stockEnabled.length > 0 && !selectedDealerId) {
          setSelectedDealerId(stockEnabled[0].id);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error filtering stock dealerships:', error);
          setStockDealerships([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    processStockDealerships();
    
    return () => {
      isCancelled = true;
    };
  }, [dealerships, dealershipsLoading, filterByModule]);

  return {
    stockDealerships,
    selectedDealerId,
    setSelectedDealerId,
    loading: dealershipsLoading || loading,
    refreshDealerships
  };
};