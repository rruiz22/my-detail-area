import { createContext, useContext, useState, ReactNode } from 'react';

interface DealerFilterContextType {
  selectedDealerId: number | 'all';
  setSelectedDealerId: (dealerId: number | 'all') => void;
}

const DealerFilterContext = createContext<DealerFilterContextType | undefined>(undefined);

interface DealerFilterProviderProps {
  children: ReactNode;
}

export const DealerFilterProvider = ({ children }: DealerFilterProviderProps) => {
  const [selectedDealerId, setSelectedDealerId] = useState<number | 'all'>('all');

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