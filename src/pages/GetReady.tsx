import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { useTranslation } from 'react-i18next';

export default function GetReady() {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout title={t('navigation.get_ready')}>
      <GetReadyContent />
    </DashboardLayout>
  );
}