import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { VendorManagement } from '@/components/get-ready/VendorManagement';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GetReadySetup } from './GetReadySetup';

export default function GetReady() {
  return (
    <Routes>
      {/* Default route redirects to Details View */}
      <Route index element={<Navigate to="details" replace />} />

      {/* Overview route */}
      <Route path="overview" element={<GetReadyContent />} />

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
