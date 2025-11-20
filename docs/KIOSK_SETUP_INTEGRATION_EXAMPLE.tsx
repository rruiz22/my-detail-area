/**
 * EXAMPLE: Integration of KioskSetupWizard into DetailHubDashboard
 *
 * This file shows how to add the KioskSetupWizard to the Detail Hub Dashboard.
 * Copy the relevant sections into DetailHubDashboard.tsx
 *
 * Changes required:
 * 1. Add imports
 * 2. Add state management for wizard
 * 3. Modify Time Clock button handler
 * 4. Add KioskSetupWizard component
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, DollarSign, Calendar, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTabPersistence } from "@/hooks/useTabPersistence";

// EXISTING IMPORTS
import { useDetailHubEmployees, useDetailHubTimeEntries, usePendingReviews, useRecentActivity } from "@/hooks/useDetailHubDatabase";
import EmployeePortal from "./EmployeePortal";
import TimecardSystem from "./TimecardSystem";
import DetailHubAnalytics from "./DetailHubAnalytics";
import ReportsCenter from "./ReportsCenter";
import InvoiceCenter from "./InvoiceCenter";
import KioskManager from "./KioskManager";
import LiveStatusDashboard from "./LiveStatusDashboard";
import ScheduleCalendar from "./ScheduleCalendar";
import { PunchClockKioskModal } from "./PunchClockKioskModal";

// ============================================
// NEW IMPORTS (ADD THESE)
// ============================================
import {
  KioskSetupWizard,
  isKioskConfigured,
  getConfiguredKioskId,
  generateDeviceFingerprint,
  getSystemUsername,
} from "./KioskSetupWizard";

const DetailHubDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ============================================
  // EXISTING STATE
  // ============================================
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [activeTab, setActiveTab] = useTabPersistence('detail_hub', 'overview');

  // ============================================
  // NEW STATE (ADD THESE)
  // ============================================
  const [showKioskSetup, setShowKioskSetup] = useState(false);
  const [kioskId, setKioskId] = useState<string | null>(null);
  const [deviceFingerprint] = useState(generateDeviceFingerprint());
  const [systemUsername] = useState(getSystemUsername());

  // Check if kiosk is configured on mount
  useEffect(() => {
    const configuredId = getConfiguredKioskId();
    setKioskId(configuredId);
  }, []);

  // REAL DATABASE INTEGRATION (EXISTING)
  const { data: employees = [], isLoading: loadingEmployees } = useDetailHubEmployees();
  const { data: timeEntries = [], isLoading: loadingEntries } = useDetailHubTimeEntries();
  const { data: pendingReviews = [] } = usePendingReviews();
  const { data: recentActivityData = [] } = useRecentActivity(5);

  // Calculate real stats from database (EXISTING)
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const todayEntries = timeEntries.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.clock_in).toDateString() === today;
  });
  const todayHours = todayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const stats = [
    { title: t('detail_hub.dashboard.stats.active_employees'), value: activeEmployees.toString(), icon: Users, change: "+2", color: "text-gray-600" },
    { title: t('detail_hub.dashboard.stats.todays_hours'), value: todayHours.toFixed(1), icon: Clock, change: "+5%", color: "text-emerald-600" },
    { title: t('detail_hub.dashboard.stats.pending_reviews'), value: pendingReviews.length.toString(), icon: AlertCircle, change: "", color: "text-amber-600" },
    { title: "Total Employees", value: employees.length.toString(), icon: UserCheck, change: "", color: "text-emerald-600" }
  ];

  // Recent activity from time entries
  const recentActivity = recentActivityData.map(entry => ({
    employee: entry.employee_name,
    action: entry.clock_out ? t('detail_hub.toasts.clocked_out') : t('detail_hub.toasts.clocked_in'),
    time: new Date(entry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    status: entry.status === 'complete' ? 'success' : 'warning'
  }));

  // ============================================
  // NEW HANDLER (MODIFY THIS)
  // ============================================
  const handleTimeClockClick = () => {
    if (!isKioskConfigured()) {
      // Show setup wizard if not configured
      console.log('[Dashboard] Kiosk not configured - showing setup wizard');
      setShowKioskSetup(true);
    } else {
      // Show time clock directly
      console.log('[Dashboard] Kiosk configured - opening time clock');
      setShowTimeClock(true);
    }
  };

  // ============================================
  // NEW CALLBACK (ADD THIS)
  // ============================================
  const handleKioskConfigured = (configuredKioskId: string) => {
    console.log('[Dashboard] Kiosk configured successfully:', configuredKioskId);
    setKioskId(configuredKioskId);
    setShowKioskSetup(false);
    // Open time clock after configuration
    setShowTimeClock(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* ============================================ */}
          {/* MODIFY THIS BUTTON (change onClick handler) */}
          {/* ============================================ */}
          <Button onClick={handleTimeClockClick}>
            <Clock className="w-4 h-4 mr-2" />
            {t('detail_hub.dashboard.quick_actions.time_clock')}
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* NEW COMPONENT (ADD THIS) */}
      {/* ============================================ */}
      <KioskSetupWizard
        open={showKioskSetup}
        onClose={() => setShowKioskSetup(false)}
        fingerprint={deviceFingerprint}
        username={systemUsername}
        onConfigured={handleKioskConfigured}
      />

      {/* ============================================ */}
      {/* EXISTING COMPONENT (update kioskId prop) */}
      {/* ============================================ */}
      <PunchClockKioskModal
        open={showTimeClock}
        onClose={() => setShowTimeClock(false)}
        kioskId={kioskId || undefined}
      />

      {/* Tabs for all Detail Hub functionality (EXISTING) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">{t('detail_hub.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="employees">{t('detail_hub.tabs.employees')}</TabsTrigger>
          <TabsTrigger value="schedules">{t('detail_hub.tabs.schedules')}</TabsTrigger>
          <TabsTrigger value="timecards">{t('detail_hub.tabs.timecards')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('detail_hub.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('detail_hub.tabs.reports')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('detail_hub.tabs.invoices')}</TabsTrigger>
          <TabsTrigger value="kiosks">{t('detail_hub.tabs.kiosks')}</TabsTrigger>
        </TabsList>

        {/* All existing tab content remains the same */}
        <TabsContent value="overview" className="space-y-6">
          <LiveStatusDashboard />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeePortal />
        </TabsContent>

        <TabsContent value="schedules">
          <ScheduleCalendar />
        </TabsContent>

        <TabsContent value="timecards">
          <TimecardSystem />
        </TabsContent>

        <TabsContent value="analytics">
          <DetailHubAnalytics />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsCenter />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceCenter />
        </TabsContent>

        <TabsContent value="kiosks">
          <KioskManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailHubDashboard;

/**
 * SUMMARY OF CHANGES
 *
 * 1. Added KioskSetupWizard imports
 * 2. Added utility function imports (isKioskConfigured, etc.)
 * 3. Added new state variables:
 *    - showKioskSetup: Controls wizard visibility
 *    - kioskId: Stores configured kiosk ID
 *    - deviceFingerprint: Browser fingerprint
 *    - systemUsername: OS/browser username
 * 4. Added useEffect to load configured kiosk on mount
 * 5. Modified handleTimeClockClick to check configuration
 * 6. Added handleKioskConfigured callback
 * 7. Added KioskSetupWizard component to JSX
 * 8. Updated PunchClockKioskModal to use kioskId prop
 *
 * RESULT: Time Clock button now shows setup wizard on first use
 */
