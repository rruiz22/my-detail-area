import React from 'react';
import { StockDashboard } from '@/components/stock/StockDashboard';
import { useTranslation } from 'react-i18next';

const Stock = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <StockDashboard />
    </div>
  );
};

export default Stock;