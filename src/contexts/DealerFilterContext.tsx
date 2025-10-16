import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DealerFilterContextType {
  selectedDealerId: number | 'all';
  setSelectedDealerId: (dealerId: number | 'all') => void;
}

const DealerFilterContext = createContext<DealerFilterContextType | undefined>(undefined);

interface DealerFilterProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'selectedDealerFilter';

export const DealerFilterProvider = ({ children }: DealerFilterProviderProps) => {
  // Initialize from localStorage
  const [selectedDealerId, setSelectedDealerId] = useState<number | 'all'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return saved === 'all' ? 'all' : parseInt(saved, 10);
      }
    } catch (error) {
      console.error('Error reading dealer filter from localStorage:', error);
    }
    return 'all';
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedDealerId.toString());
    } catch (error) {
      console.error('Error saving dealer filter to localStorage:', error);
    }
  }, [selectedDealerId]);

  return (
    <DealerFilterContext.Provider value={{ selectedDealerId, setSelectedDealerId }}>
      {children}
    </DealerFilterContext.Provider>
  );
};

export const useDealerFilter = () => {
  const context = useContext(DealerFilterContext);
  if (context === undefined) {
    throw new Error('useDealerFilter must be used within a DealerFilterProvider');
  }
  return context;
};