import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import DetailHubDashboard from "@/components/detail-hub/DetailHubDashboard";
import EmployeePortal from "@/components/detail-hub/EmployeePortal";
import TimecardSystem from "@/components/detail-hub/TimecardSystem";
import InvoiceCenter from "@/components/detail-hub/InvoiceCenter";
import ReportsCenter from "@/components/detail-hub/ReportsCenter";
import PunchClockKiosk from "@/components/detail-hub/PunchClockKiosk";
import KioskManager from "@/components/detail-hub/KioskManager";

const DetailHub = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DetailHubDashboard />} />
        <Route path="employees" element={<EmployeePortal />} />
        <Route path="timecard" element={<TimecardSystem />} />
        <Route path="invoices" element={<InvoiceCenter />} />
        <Route path="reports" element={<ReportsCenter />} />
        <Route path="kiosk" element={<PunchClockKiosk />} />
        <Route path="kiosk-manager" element={<KioskManager />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DetailHub;