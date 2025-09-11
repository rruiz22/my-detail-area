import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StockDashboard } from '@/components/stock/StockDashboard';
import { useTranslation } from 'react-i18next';

const Stock = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout title={t('stock.title')}>
      <StockDashboard />
    </DashboardLayout>
  );
};

export default Stock;