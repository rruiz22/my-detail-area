import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { VendorManagement } from '@/components/get-ready/VendorManagement';
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

      {/* Vendors - NEW: Full vendor management */}
      <Route path="vendors" element={<GetReadyContent><VendorManagement /></GetReadyContent>} />

      {/* Reports */}
      <Route path="reports" element={<GetReadyContent />} />

      {/* Setup - system_admin only */}
      <Route path="setup" element={<GetReadySetup />} />

      {/* Direct vehicle link from search - /get-ready/:vehicleId */}
      <Route path=":vehicleId" element={<GetReadyContent />} />
    </Routes>
  );
}