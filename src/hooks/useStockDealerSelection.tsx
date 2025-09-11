import { useState, useEffect, useCallback } from 'react';
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
  needsSelection: boolean;
  refreshDealerships: () => void;
}

export const useStockDealerSelection = (): UseStockDealerSelectionReturn => {
  const { dealerships, loading: dealershipsLoading, filterByModule, refreshDealerships } = useAccessibleDealerships();
  const [stockDealerships, setStockDealerships] = useState<StockEnabledDealer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simple localStorage access without hooks to avoid circular dependencies
  const getStoredDealerId = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem('mda.stock-selected-dealer');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }, []);

  const setStoredDealerId = useCallback((dealerId: number | null) => {
    try {
      if (dealerId) {
        localStorage.setItem('mda.stock-selected-dealer', dealerId.toString());
      } else {
        localStorage.removeItem('mda.stock-selected-dealer');
      }
    } catch (error) {
      console.error('Failed to store dealer ID:', error);
    }
  }, []);

  const [selectedDealerId, setSelectedDealerIdState] = useState<number | null>(() => getStoredDealerId());

  const setSelectedDealerId = useCallback((dealerId: number) => {
    setSelectedDealerIdState(dealerId);
    setStoredDealerId(dealerId);
  }, [setStoredDealerId]);

  // Single effect to filter dealerships - removed all problematic dependencies
  useEffect(() => {
    let isCancelled = false;
    
    const fetchStockDealerships = async () => {
      if (!dealerships.length || dealershipsLoading) return;
      
      try {
        setLoading(true);
        const stockEnabled = await filterByModule('stock');
        
        if (isCancelled) return;
        
        setStockDealerships(stockEnabled);
        
        // Auto-select logic
        const currentSelected = getStoredDealerId();
        if (stockEnabled.length === 1 && !currentSelected) {
          const dealerId = stockEnabled[0].id;
          setSelectedDealerIdState(dealerId);
          setStoredDealerId(dealerId);
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

    fetchStockDealerships();
    
    return () => {
      isCancelled = true;
    };
  }, [dealerships.length, dealershipsLoading]); // Minimal dependencies

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