import { useState, useEffect } from 'react';
import { useAccessibleDealerships } from './useAccessibleDealerships';
import { usePersistedState } from './usePersistedState';

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
  needsSelection: boolean;
  refreshDealerships: () => void;
}

export const useStockDealerSelection = (): UseStockDealerSelectionReturn => {
  const { dealerships, loading: dealershipsLoading, filterByModule, refreshDealerships } = useAccessibleDealerships();
  const [stockDealerships, setStockDealerships] = useState<StockEnabledDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealerId, setSelectedDealerId] = usePersistedState<number | null>('stock-selected-dealer', null);

  // Filter dealerships with stock module access
  useEffect(() => {
    const fetchStockDealerships = async () => {
      if (!dealerships.length) return;
      
      try {
        setLoading(true);
        const stockEnabled = await filterByModule('stock');
        setStockDealerships(stockEnabled);
        
        // Auto-select if only one dealer has stock access
        if (stockEnabled.length === 1 && !selectedDealerId) {
          setSelectedDealerId(stockEnabled[0].id);
        }
        
        // Validate current selection is still valid
        if (selectedDealerId && !stockEnabled.find(d => d.id === selectedDealerId)) {
          setSelectedDealerId(null);
        }
      } catch (error) {
        console.error('Error filtering stock dealerships:', error);
        setStockDealerships([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStockDealerships();
  }, [dealerships, filterByModule, selectedDealerId, setSelectedDealerId]);

  const needsSelection = !loading && stockDealerships.length > 1 && !selectedDealerId;

  return {
    stockDealerships,
    selectedDealerId,
    setSelectedDealerId,
    loading: dealershipsLoading || loading,
    needsSelection,
    refreshDealerships
  };
};