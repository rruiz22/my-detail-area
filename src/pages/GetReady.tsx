import React from 'react';
import { GetReadyLayout } from '@/components/get-ready/GetReadyLayout';
import { GetReadySplitContent } from '@/components/get-ready/GetReadySplitContent';

export default function GetReady() {
  return (
    <GetReadyLayout>
      <GetReadySplitContent className="p-4" />
    </GetReadyLayout>
  );
}