import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { GetReadySetup } from './GetReadySetup';

export default function GetReady() {
  return (
    <Routes>
      {/* Default overview route */}
      <Route index element={<GetReadyContent />} />

      {/* Details view */}
      <Route path="details" element={<GetReadyContent />} />

      {/* Approvals */}
      <Route path="approvals" element={<GetReadyContent />} />

      {/* Vendors */}
      <Route path="vendors" element={<GetReadyContent />} />

      {/* Reports */}
      <Route path="reports" element={<GetReadyContent />} />

      {/* Setup - system_admin only */}
      <Route path="setup" element={<GetReadySetup />} />
    </Routes>
  );
}