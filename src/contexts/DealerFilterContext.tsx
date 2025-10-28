import { createContext, useContext, useState, ReactNode } from 'react';

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
  const [selectedDealerId, setSelectedDealerIdState] = useState<number | 'all'>(() => {
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

  // Wrapper function that updates both state AND localStorage synchronously
  const setSelectedDealerId = (dealerId: number | 'all') => {
    console.log('🔧 [DealerFilterContext] setSelectedDealerId called:', { from: selectedDealerId, to: dealerId });

    // Update localStorage FIRST (synchronously) before updating state
    try {
      localStorage.setItem(STORAGE_KEY, dealerId.toString());
      console.log('💾 [DealerFilterContext] localStorage updated:', dealerId.toString());
    } catch (error) {
      console.error('Error saving dealer filter to localStorage:', error);
    }

    // Then update state (triggers re-render)
    setSelectedDealerIdState(dealerId);
    console.log('🔄 [DealerFilterContext] State updated to:', dealerId);
  };

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