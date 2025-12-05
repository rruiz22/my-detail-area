import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, DollarSign, Calendar, UserCheck, TrendingUp, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { usePermissions } from "@/hooks/usePermissions";
// REAL DATABASE INTEGRATION
import { useDetailHubEmployees, useDetailHubTimeEntries, usePendingReviews, useRecentActivity } from "@/hooks/useDetailHubDatabase";
// SUB-COMPONENTS (for tabs)
import EmployeePortal from "./EmployeePortal";
import TimecardSystem from "./TimecardSystem";
import DetailHubAnalytics from "./DetailHubAnalytics";
import ReportsCenter from "./ReportsCenter";
import InvoiceCenter from "./InvoiceCenter";
import KioskManager from "./KioskManager";
import LiveStatusDashboard from "./LiveStatusDashboard";
import { PunchClockKioskModal } from "./PunchClockKioskModal";
// KIOSK SETUP WIZARD
import { KioskSetupWizard, isKioskConfigured, getConfiguredKioskId, generateDeviceFingerprint, getSystemUsername } from "./KioskSetupWizard";
// KIOSK CONFIG CLEANUP
import { clearInvalidKioskConfig } from "@/hooks/useKioskConfig";
// KIOSK DIAGNOSTICS (loads utility functions into window.kioskDiagnostics)
import "@/utils/kioskDiagnostics";

const DetailHubDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showTimeClock, setShowTimeClock] = useState(false); // Modal state
  const { isSystemAdmin } = usePermissions();

  // KIOSK SETUP WIZARD STATE
  const [showKioskSetup, setShowKioskSetup] = useState(false);
  const [kioskId, setKioskId] = useState<string | null>(null);
  const [deviceFingerprint] = useState(generateDeviceFingerprint());
  const [systemUsername] = useState(getSystemUsername());

  // Persisted tab state
  const [activeTab, setActiveTab] = useTabPersistence('detail_hub', 'overview');

  // Initialize kiosk ID on mount
  useEffect(() => {
    // ⚠️ REMOVED: clearInvalidKioskConfig() - No longer needed with triple-recovery system
    // The new recovery system in useKioskConfig.tsx handles validation automatically:
    // - Recovery attempts registration_code → fingerprint → history
    // - Only clears obviously invalid configs (default-kiosk, malformed UUIDs)
    // - Validation of kiosk existence happens in PunchClockKioskModal
    // clearInvalidKioskConfig(); // ← COMMENTED OUT (kept import for safety)

    const configuredId = getConfiguredKioskId();
    setKioskId(configuredId);
    console.log('[DetailHub] Kiosk configured:', configuredId ? 'YES' : 'NO', configuredId);
  }, []);

  // REAL DATABASE INTEGRATION
  const { data: employees = [], isLoading: loadingEmployees } = useDetailHubEmployees();
  const { data: timeEntries = [], isLoading: loadingEntries } = useDetailHubTimeEntries();
  const { data: pendingReviews = [] } = usePendingReviews();
  const { data: recentActivityData = [] } = useRecentActivity(5);

  // Calculate real stats from database
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

  // Recent activity from time entries (last 5) - now includes employee names from hook
  const recentActivity = recentActivityData.map(entry => ({
    employee: entry.employee_name,
    action: entry.clock_out ? t('detail_hub.toasts.clocked_out') : t('detail_hub.toasts.clocked_in'),
    time: new Date(entry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    status: entry.status === 'complete' ? 'success' : 'warning'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* Kiosk Configuration Button */}
          <Button
            variant="outline"
            onClick={() => {
              console.log('[DetailHub] Opening kiosk setup wizard (manual)');
              setShowKioskSetup(true);
            }}
            title={isKioskConfigured() ? "Reconfigure Kiosk" : "Configure Kiosk"}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isKioskConfigured() ? 'Kiosk Settings' : 'Setup Kiosk'}
          </Button>

          {/* Time Clock Button */}
          <Button
            onClick={() => {
              // Check if kiosk is configured before opening time clock
              if (!isKioskConfigured()) {
                console.log('[DetailHub] Kiosk not configured - showing setup wizard');
                setShowKioskSetup(true);
              } else {
                console.log('[DetailHub] Kiosk configured - opening time clock');
                setShowTimeClock(true);
              }
            }}
          >
            <Clock className="w-4 h-4 mr-2" />
            {t('detail_hub.dashboard.quick_actions.time_clock')}
            {!isKioskConfigured() && (
              <Badge variant="outline" className="ml-2 text-xs">Setup Required</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Kiosk Setup Wizard (First-Run Configuration) */}
      <KioskSetupWizard
        open={showKioskSetup}
        onClose={() => {
          console.log('[DetailHub] Kiosk setup wizard closed');
          setShowKioskSetup(false);
        }}
        fingerprint={deviceFingerprint}
        username={systemUsername}
        onConfigured={(newKioskId) => {
          console.log('[DetailHub] Kiosk configured successfully:', newKioskId);
          setKioskId(newKioskId);
          setShowKioskSetup(false);
          // Auto-open time clock after configuration
          setShowTimeClock(true);
        }}
      />

      {/* Time Clock Modal - Enterprise Kiosk (only if configured) */}
      <PunchClockKioskModal
        open={showTimeClock && isKioskConfigured()}
        onClose={() => setShowTimeClock(false)}
        kioskId={kioskId || undefined}
      />

      {/* Tabs for all Detail Hub functionality */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isSystemAdmin ? 'grid-cols-7' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">{t('detail_hub.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="employees">{t('detail_hub.tabs.employees')}</TabsTrigger>
          <TabsTrigger value="timecards">{t('detail_hub.tabs.timecards')}</TabsTrigger>
          {isSystemAdmin && (
            <TabsTrigger value="analytics">
              <span className="flex items-center gap-2">
                {t('detail_hub.tabs.analytics')}
                <Badge variant="secondary" className="text-xs">hidden</Badge>
              </span>
            </TabsTrigger>
          )}
          {isSystemAdmin && (
            <TabsTrigger value="reports">
              <span className="flex items-center gap-2">
                {t('detail_hub.tabs.reports')}
                <Badge variant="secondary" className="text-xs">hidden</Badge>
              </span>
            </TabsTrigger>
          )}
          {isSystemAdmin && (
            <TabsTrigger value="invoices">
              <span className="flex items-center gap-2">
                {t('detail_hub.tabs.invoices')}
                <Badge variant="secondary" className="text-xs">hidden</Badge>
              </span>
            </TabsTrigger>
          )}
          <TabsTrigger value="kiosks">{t('detail_hub.tabs.kiosks')}</TabsTrigger>
        </TabsList>

        {/* TAB: Overview - Live Status Dashboard */}
        <TabsContent value="overview" className="space-y-6">
          <LiveStatusDashboard />
        </TabsContent>

        {/* TAB: Employees */}
        <TabsContent value="employees">
          <EmployeePortal />
        </TabsContent>

        {/* TAB: Timecards */}
        <TabsContent value="timecards">
          <TimecardSystem />
        </TabsContent>

        {/* TAB: Analytics - System Admin Only */}
        {isSystemAdmin && (
          <TabsContent value="analytics">
            <DetailHubAnalytics />
          </TabsContent>
        )}

        {/* TAB: Reports - System Admin Only */}
        {isSystemAdmin && (
          <TabsContent value="reports">
            <ReportsCenter />
          </TabsContent>
        )}

        {/* TAB: Invoices - System Admin Only */}
        {isSystemAdmin && (
          <TabsContent value="invoices">
            <InvoiceCenter />
          </TabsContent>
        )}

        {/* TAB: Kiosks */}
        <TabsContent value="kiosks">
          <KioskManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailHubDashboard;
