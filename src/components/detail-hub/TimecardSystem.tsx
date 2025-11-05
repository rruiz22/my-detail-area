import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, Filter, Clock, User, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
// PHASE 5: Photo review integration
import { useDetailHubIntegration } from "@/hooks/useDetailHubIntegration";
import { PhotoReviewCard } from "./PhotoReviewCard";
// OPCIÓN A: Real database integration (NEW - optional toggle)
import { usePendingReviews, useApproveTimeEntry, useRejectTimeEntry } from "@/hooks/useDetailHubDatabase";

const TimecardSystem = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // OPCIÓN A: Toggle between mock and real database (default: MOCK for safety)
  const [useRealDatabase, setUseRealDatabase] = useState(false);

  // Mock data hooks
  const { timeEntries: mockTimeEntries, approveTimeEntry: mockApprove, rejectTimeEntry: mockReject } = useDetailHubIntegration();

  // Real database hooks
  const { data: realPendingReviews = [], isLoading: loadingReviews } = usePendingReviews();
  const { mutateAsync: realApprove } = useApproveTimeEntry();
  const { mutateAsync: realReject } = useRejectTimeEntry();

  // Choose data source based on toggle
  const pendingReviews = useRealDatabase ? realPendingReviews : mockTimeEntries.filter(entry => entry.requires_manual_verification && entry.photo_in_url);
  const approveTimeEntry = useRealDatabase ? realApprove : mockApprove;
  const rejectTimeEntry = useRealDatabase ? realReject : mockReject;

  const timecards = [
    {
      employeeId: "EMP001",
      employeeName: "John Smith",
      date: "2024-12-12",
      clockIn: "8:00 AM",
      clockOut: "5:30 PM",
      breakStart: "12:00 PM",
      breakEnd: "12:30 PM",
      totalHours: 9.0,
      regularHours: 8.0,
      overtimeHours: 1.0,
      hourlyRate: 25.00,
      totalPay: 237.50,
      status: "Complete"
    },
    {
      employeeId: "EMP002",
      employeeName: "Maria Garcia", 
      date: "2024-12-12",
      clockIn: "8:15 AM",
      clockOut: "5:00 PM",
      breakStart: "12:15 PM",
      breakEnd: "12:45 PM",
      totalHours: 8.25,
      regularHours: 8.0,
      overtimeHours: 0.25,
      hourlyRate: 20.00,
      totalPay: 167.50,
      status: "Complete"
    },
    {
      employeeId: "EMP003",
      employeeName: "Mike Johnson",
      date: "2024-12-12",
      clockIn: "7:45 AM",
      clockOut: "4:30 PM",
      breakStart: "11:30 AM",
      breakEnd: "12:00 PM",
      totalHours: 8.25,
      regularHours: 8.0,
      overtimeHours: 0.25,
      hourlyRate: 18.00,
      totalPay: 150.75,
      status: "Complete"
    },
    {
      employeeId: "EMP004",
      employeeName: "Sarah Wilson",
      date: "2024-12-12",
      clockIn: "8:45 AM",
      clockOut: "--",
      breakStart: "12:30 PM",
      breakEnd: "1:00 PM",
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      hourlyRate: 22.00,
      totalPay: 0,
      status: "Clocked In"
    }
  ];

  const weeklyStats = {
    totalEmployees: 24,
    totalHours: 192,
    regularHours: 168,
    overtimeHours: 24,
    totalPayroll: 4680.00,
    averageHoursPerEmployee: 8.0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Complete":
        return <Badge className="bg-green-100 text-green-800">{t('detail_hub.timecard.status_badges.complete')}</Badge>;
      case "Clocked In":
        return <Badge className="bg-blue-100 text-blue-800">{t('detail_hub.timecard.status_badges.active')}</Badge>;
      case "Late":
        return <Badge className="bg-red-100 text-red-800">{t('detail_hub.timecard.status_badges.late')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.timecard.title')}</h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">{t('detail_hub.timecard.subtitle')}</p>
            {/* OPCIÓN A: Database Mode Toggle */}
            <Badge variant="outline" className={useRealDatabase ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>
              {useRealDatabase ? "Real Database" : "Mock Data"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {/* OPCIÓN A: Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseRealDatabase(!useRealDatabase)}
          >
            {useRealDatabase ? "Switch to Mock" : "Switch to Real DB"}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "PPP") : t('detail_hub.timecard.pick_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.filter')}
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.export')}
          </Button>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.total_hours')}</p>
                <p className="text-2xl font-bold">{weeklyStats.totalHours}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.overtime_hours')}</p>
                <p className="text-2xl font-bold">{weeklyStats.overtimeHours}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{weeklyStats.totalEmployees}</p>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.total_payroll')}</p>
                <p className="text-2xl font-bold">${weeklyStats.totalPayroll.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PHASE 5: Pending Photo Reviews (NEW - only visible if there are pending reviews) */}
      {pendingReviews.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                {t('detail_hub.timecard.photo_reviews.title')}
              </CardTitle>
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                {t('detail_hub.timecard.photo_reviews.pending_count', { count: pendingReviews.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingReviews.map((entry) => (
                <PhotoReviewCard
                  key={entry.id}
                  timeEntry={{
                    id: entry.id,
                    employee_id: entry.employee_id,
                    employee_name: undefined, // TODO: Join with employees table
                    clock_in: entry.clock_in,
                    punch_in_method: 'photo_fallback',
                    photo_in_url: entry.photo_in_url!,
                    requires_manual_verification: true
                  }}
                  onApprove={approveTimeEntry}
                  onReject={rejectTimeEntry}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">{t('detail_hub.timecard.daily_view')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('detail_hub.timecard.weekly_summary')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('detail_hub.timecard.monthly_report')}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('detail_hub.timecard.daily_timecards')} - {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail_hub.timecard.table.employee')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.clock_in')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.clock_out')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.break')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.total_hours')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.overtime')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.pay')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timecards.map((timecard) => (
                    <TableRow key={timecard.employeeId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{timecard.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{timecard.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{timecard.clockIn}</TableCell>
                      <TableCell>{timecard.clockOut}</TableCell>
                      <TableCell>
                        {timecard.breakStart} - {timecard.breakEnd}
                      </TableCell>
                      <TableCell>{timecard.totalHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}</TableCell>
                      <TableCell>
                        {timecard.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {timecard.overtimeHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}
                          </span>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell>${timecard.totalPay.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(timecard.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.timecard.weekly_summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Regular Hours:</span>
                    <span className="font-medium">{weeklyStats.regularHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Overtime Hours:</span>
                    <span className="font-medium text-orange-600">{weeklyStats.overtimeHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Average per Employee:</span>
                    <span className="font-medium">{weeklyStats.averageHoursPerEmployee}h</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Employees:</span>
                    <span className="font-medium">{weeklyStats.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Hours:</span>
                    <span className="font-medium">{weeklyStats.totalHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Payroll:</span>
                    <span className="font-medium text-green-600">${weeklyStats.totalPayroll.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.timecard.monthly_report')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Monthly report functionality coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimecardSystem;