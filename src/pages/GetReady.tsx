import React from 'react';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { useTranslation } from 'react-i18next';

export default function GetReady() {
  const { t } = useTranslation();
  
  return (
    <div>
      <GetReadyContent />
    </div>
  );
}