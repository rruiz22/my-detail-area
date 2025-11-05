import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, DollarSign, Calendar, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
// REAL DATABASE INTEGRATION
import { useDetailHubEmployees, useDetailHubTimeEntries, usePendingReviews } from "@/hooks/useDetailHubDatabase";
// SUB-COMPONENTS (for tabs)
import EmployeePortal from "./EmployeePortal";
import TimecardSystem from "./TimecardSystem";
import DetailHubAnalytics from "./DetailHubAnalytics";
import ReportsCenter from "./ReportsCenter";
import InvoiceCenter from "./InvoiceCenter";
import KioskManager from "./KioskManager";
import { TimeClockModal } from "./TimeClockModal";

const DetailHubDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showTimeClock, setShowTimeClock] = useState(false); // Modal state

  // REAL DATABASE INTEGRATION
  const { data: employees = [], isLoading: loadingEmployees } = useDetailHubEmployees();
  const { data: timeEntries = [], isLoading: loadingEntries } = useDetailHubTimeEntries();
  const { data: pendingReviews = [] } = usePendingReviews();

  // Calculate real stats from database
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const todayEntries = timeEntries.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.clock_in).toDateString() === today;
  });
  const todayHours = todayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const stats = [
    { title: t('detail_hub.dashboard.stats.active_employees'), value: activeEmployees.toString(), icon: Users, change: "+2", color: "text-blue-600" },
    { title: t('detail_hub.dashboard.stats.todays_hours'), value: todayHours.toFixed(1), icon: Clock, change: "+5%", color: "text-green-600" },
    { title: t('detail_hub.dashboard.stats.pending_reviews'), value: pendingReviews.length.toString(), icon: AlertCircle, change: "", color: "text-orange-600" },
    { title: "Total Employees", value: employees.length.toString(), icon: UserCheck, change: "", color: "text-emerald-600" }
  ];

  // Recent activity from time entries (last 5)
  const recentActivity = timeEntries.slice(0, 5).map(entry => ({
    employee: entry.employee_id, // TODO: Join with employees to get name
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
          <Button onClick={() => setShowTimeClock(true)}>
            <Clock className="w-4 h-4 mr-2" />
            {t('detail_hub.dashboard.quick_actions.time_clock')}
          </Button>
        </div>
      </div>

      {/* Time Clock Modal */}
      <TimeClockModal open={showTimeClock} onClose={() => setShowTimeClock(false)} />

      {/* Tabs for all Detail Hub functionality */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">{t('detail_hub.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="employees">{t('detail_hub.tabs.employees')}</TabsTrigger>
          <TabsTrigger value="timecards">{t('detail_hub.tabs.timecards')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('detail_hub.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('detail_hub.tabs.reports')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('detail_hub.tabs.invoices')}</TabsTrigger>
          <TabsTrigger value="kiosks">{t('detail_hub.tabs.kiosks')}</TabsTrigger>
        </TabsList>

        {/* TAB: Overview (contenido actual) */}
        <TabsContent value="overview" className="space-y-6">

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'}>
                  {stat.change}
                </span>
                {" "}{t('time.last_week')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail_hub.dashboard.quick_actions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/timecard")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('detail_hub.timecard.title')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/invoices")}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {t('detail_hub.invoices.title')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/reports")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('detail_hub.reports.title')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/kiosk-manager")}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {t('detail_hub.kiosk_manager.title')}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail_hub.dashboard.recent_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{activity.employee}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail_hub.punch_clock.status.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">{t('detail_hub.punch_clock.status.face_recognition')}: {t('detail_hub.punch_clock.status.online')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">{t('detail_hub.dashboard.quick_actions.time_clock')}: {t('detail_hub.punch_clock.status.active')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">{t('detail_hub.punch_clock.status.network_connection')}: {t('detail_hub.timecard.status_badges.clocked_in')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* TAB: Employees */}
        <TabsContent value="employees">
          <EmployeePortal />
        </TabsContent>

        {/* TAB: Timecards */}
        <TabsContent value="timecards">
          <TimecardSystem />
        </TabsContent>

        {/* TAB: Analytics */}
        <TabsContent value="analytics">
          <DetailHubAnalytics />
        </TabsContent>

        {/* TAB: Reports */}
        <TabsContent value="reports">
          <ReportsCenter />
        </TabsContent>

        {/* TAB: Invoices */}
        <TabsContent value="invoices">
          <InvoiceCenter />
        </TabsContent>

        {/* TAB: Kiosks */}
        <TabsContent value="kiosks">
          <KioskManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailHubDashboard;
