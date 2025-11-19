import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, Filter, Clock, User, DollarSign, AlertTriangle, Camera, Image as ImageIcon, Plus, FileText, Edit2, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
// Real database integration (NO MOCK DATA)
import { usePendingReviews, useApproveTimeEntry, useRejectTimeEntry, TimeEntryWithEmployee, useDetailHubTimeEntries, useDetailHubEmployees, useDisableTimeEntry } from "@/hooks/useDetailHubDatabase";
import { PhotoReviewCard } from "./PhotoReviewCard";
import { ManualTimeEntryModal } from "./ManualTimeEntryModal";
import { TimeEntryLogsModal } from "./TimeEntryLogsModal";
import { EditTimeEntryModal } from "./EditTimeEntryModal";

type DateFilter = 'today' | 'this_week' | 'last_week' | 'custom';

/**
 * Timecard System - Real Database Integration
 * Displays employee time entries with photo thumbnails and date filtering
 */
const TimecardSystem = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    employeeName: string;
    employeeNumber: string;
    timestamp: string;
    type: 'clock_in' | 'clock_out';
    method: string;
    timeEntryId: string;
  } | null>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntryWithEmployee | null>(null);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [entryToDisable, setEntryToDisable] = useState<string | null>(null);

  // Real database hooks (NO MOCK DATA)
  const { data: pendingReviews = [], isLoading: loadingReviews } = usePendingReviews();
  const { data: timeEntries = [], isLoading: loadingTimeEntries } = useDetailHubTimeEntries();
  const { data: employees = [], isLoading: loadingEmployees } = useDetailHubEmployees();
  const { mutateAsync: approveTimeEntry } = useApproveTimeEntry();
  const { mutateAsync: rejectTimeEntry } = useRejectTimeEntry();
  const { mutateAsync: disableTimeEntry } = useDisableTimeEntry();

  // Create employee hourly rate lookup map
  const employeeRates = employees.reduce((map, emp) => {
    map[emp.id] = emp.hourly_rate || 0;
    return map;
  }, {} as Record<string, number>);

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return { start: today, end: today };

      case 'this_week': {
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
      }

      case 'last_week': {
        const dayOfWeek = now.getDay();
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 13 : dayOfWeek + 6));
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        return { start: lastMonday, end: lastSunday };
      }

      case 'custom': {
        const selected = selectedDate || today;
        return { start: selected, end: selected };
      }

      default:
        return { start: today, end: today };
    }
  };

  const dateRange = getDateRange();

  // Transform real time entries to table format
  const transformTimeEntry = (entry: TimeEntryWithEmployee) => {
    const formatTime = (isoString: string | null) => {
      if (!isoString) return "--";
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    // Get hourly rate from employee
    const hourlyRate = employeeRates[entry.employee_id] || 0;

    // Calculate pay (regular + overtime)
    const regularPay = (entry.regular_hours || 0) * hourlyRate;
    const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5; // OT = 1.5x rate
    const totalPay = regularPay + overtimePay;

    return {
      id: entry.id, // Use unique time entry ID as key
      employeeId: entry.employee_number || 'N/A',
      employeeName: entry.employee_name,
      date: new Date(entry.clock_in).toISOString().split('T')[0],
      clockIn: formatTime(entry.clock_in),
      clockOut: formatTime(entry.clock_out),
      breakStart: formatTime(entry.break_start),
      breakEnd: formatTime(entry.break_end),
      totalHours: entry.total_hours || 0,
      regularHours: entry.regular_hours || 0,
      overtimeHours: entry.overtime_hours || 0,
      hourlyRate: hourlyRate,
      totalPay: Math.round(totalPay * 100) / 100,
      photoInUrl: entry.photo_in_url,
      photoOutUrl: entry.photo_out_url,
      punchInMethod: entry.punch_in_method,
      punchOutMethod: entry.punch_out_method,
      status: entry.status === 'active' ? 'Active' :
              entry.status === 'complete' ? 'Complete' :
              entry.status === 'disputed' ? 'Disputed' : 'Approved'
    };
  };

  // Filter and transform time entries based on selected date range
  const filteredTimeEntries = (() => {
    const startString = dateRange.start.toISOString().split('T')[0];
    const endString = dateRange.end.toISOString().split('T')[0];

    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
      return entryDate >= startString && entryDate <= endString;
    });
  })();

  const timecards = filteredTimeEntries.map(transformTimeEntry);

  // Calculate real stats from filtered entries (NO MOCK DATA)
  const stats = (() => {
    // Calculate total hours (sum of all total_hours)
    const totalHours = filteredTimeEntries.reduce((sum, entry) => {
      return sum + (entry.total_hours || 0);
    }, 0);

    // Calculate overtime hours
    const overtimeHours = filteredTimeEntries.reduce((sum, entry) => {
      return sum + (entry.overtime_hours || 0);
    }, 0);

    // Count unique active employees (status = 'active')
    const activeEmployeeIds = new Set(
      filteredTimeEntries
        .filter(entry => entry.status === 'active')
        .map(entry => entry.employee_id)
    );

    // Calculate total payroll using hourly_rate from employees
    const totalPayroll = filteredTimeEntries.reduce((sum, entry) => {
      const hourlyRate = employeeRates[entry.employee_id] || 0;
      const regularPay = (entry.regular_hours || 0) * hourlyRate;
      const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5; // OT = 1.5x rate
      return sum + regularPay + overtimePay;
    }, 0);

    return {
      totalEmployees: activeEmployeeIds.size,
      totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimals
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      totalPayroll: Math.round(totalPayroll * 100) / 100,
      filteredCount: filteredTimeEntries.length
    };
  })();

  // Calculate weekly stats from database
  const calculateWeeklyStats = () => {
    // Get all entries (could filter by week if needed)
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
    const regularHours = timeEntries.reduce((sum, entry) => sum + (entry.regular_hours || 0), 0);
    const overtimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);

    // Count unique employees
    const uniqueEmployees = new Set(timeEntries.map(e => e.employee_id));
    const totalEmployees = uniqueEmployees.size;

    const averageHoursPerEmployee = totalEmployees > 0
      ? Math.round((totalHours / totalEmployees) * 100) / 100
      : 0;

    // Calculate total payroll using hourly_rate from employees
    const totalPayroll = timeEntries.reduce((sum, entry) => {
      const hourlyRate = employeeRates[entry.employee_id] || 0;
      const regularPay = (entry.regular_hours || 0) * hourlyRate;
      const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5; // OT = 1.5x rate
      return sum + regularPay + overtimePay;
    }, 0);

    return {
      totalEmployees,
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      totalPayroll: Math.round(totalPayroll * 100) / 100,
      averageHoursPerEmployee
    };
  };

  const weeklyStats = calculateWeeklyStats();

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
          <p className="text-muted-foreground">{t('detail_hub.timecard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* Quick Date Filters */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('today')}
            >
              {t('detail_hub.timecard.filters.today')}
            </Button>
            <Button
              variant={dateFilter === 'this_week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('this_week')}
            >
              {t('detail_hub.timecard.filters.this_week')}
            </Button>
            <Button
              variant={dateFilter === 'last_week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter('last_week')}
            >
              {t('detail_hub.timecard.filters.last_week')}
            </Button>
          </div>

          {/* Custom Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setDateFilter('custom')}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateFilter === 'custom' && selectedDate
                  ? format(selectedDate, "PPP")
                  : t('detail_hub.timecard.filters.custom_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setDateFilter('custom');
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={() => setShowManualEntryModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.manual_entry.add_button')}
          </Button>

          <Button>
            <Download className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.export')}
          </Button>
        </div>
      </div>

      {/* Real-time Stats from Database */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.total_hours')}</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(2)}h</p>
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
                <p className="text-2xl font-bold">{stats.overtimeHours.toFixed(2)}h</p>
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
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
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
                <p className="text-2xl font-bold">${stats.totalPayroll.toFixed(2)}</p>
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
              {pendingReviews.map((entry: TimeEntryWithEmployee) => (
                <PhotoReviewCard
                  key={entry.id}
                  timeEntry={{
                    id: entry.id,
                    employee_id: entry.employee_id,
                    employee_name: entry.employee_name,
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
                {dateFilter === 'today' && t('detail_hub.timecard.filters.todays_timecards')}
                {dateFilter === 'this_week' && `${t('detail_hub.timecard.filters.this_weeks_timecards')} (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')})`}
                {dateFilter === 'last_week' && `${t('detail_hub.timecard.filters.last_weeks_timecards')} (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')})`}
                {dateFilter === 'custom' && selectedDate && `${t('detail_hub.timecard.daily_timecards')} - ${format(selectedDate, "MMMM d, yyyy")}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail_hub.timecard.table.employee')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.photo')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.clock_in')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.clock_out')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.break')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.total_hours')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.overtime')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.pay')}</TableHead>
                    <TableHead>{t('detail_hub.timecard.table.status')}</TableHead>
                    <TableHead className="w-[100px]">{t('detail_hub.timecard.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTimeEntries ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                          <span className="text-muted-foreground">{t('detail_hub.timecard.loading')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : timecards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">{t('detail_hub.timecard.no_entries')}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    timecards.map((timecard) => (
                      <TableRow key={timecard.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{timecard.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{timecard.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {timecard.photoInUrl ? (
                            <button
                              onClick={() => setSelectedPhoto({
                                url: timecard.photoInUrl!,
                                employeeName: timecard.employeeName,
                                employeeNumber: timecard.employeeId,
                                timestamp: timecard.clockIn,
                                type: 'clock_in',
                                method: timecard.punchInMethod || 'photo_fallback',
                                timeEntryId: timecard.id
                              })}
                              className="relative group"
                              title="View clock-in photo"
                            >
                              <img
                                src={timecard.photoInUrl}
                                alt="Clock In"
                                className="w-10 h-10 rounded object-cover border-2 border-green-500 hover:border-green-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchInMethod === 'photo_fallback' ? (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          ) : null}

                          {timecard.photoOutUrl ? (
                            <button
                              onClick={() => setSelectedPhoto({
                                url: timecard.photoOutUrl!,
                                employeeName: timecard.employeeName,
                                employeeNumber: timecard.employeeId,
                                timestamp: timecard.clockOut,
                                type: 'clock_out',
                                method: timecard.punchOutMethod || 'photo_fallback',
                                timeEntryId: timecard.id
                              })}
                              className="relative group"
                              title="View clock-out photo"
                            >
                              <img
                                src={timecard.photoOutUrl}
                                alt="Clock Out"
                                className="w-10 h-10 rounded object-cover border-2 border-red-500 hover:border-red-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchOutMethod === 'photo_fallback' && timecard.clockOut !== '--' ? (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          ) : null}
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
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowLogsModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.view_logs')}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowEditModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEntryToDisable(timecard.id);
                              setShowDisableDialog(true);
                            }}
                            title={t('detail_hub.timecard.actions.disable')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
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

      {/* Manual Time Entry Modal */}
      <ManualTimeEntryModal
        open={showManualEntryModal}
        onOpenChange={setShowManualEntryModal}
        employees={employees}
      />

      {/* Audit Logs Modal */}
      <TimeEntryLogsModal
        open={showLogsModal}
        onOpenChange={setShowLogsModal}
        timeEntryId={selectedTimeEntry?.id || null}
        employeeName={selectedTimeEntry?.employee_name || ""}
      />

      {/* Edit Time Entry Modal */}
      <EditTimeEntryModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        timeEntry={selectedTimeEntry}
      />

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail_hub.timecard.disable_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail_hub.timecard.disable_dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('detail_hub.timecard.disable_dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (entryToDisable) {
                  await disableTimeEntry({ timeEntryId: entryToDisable });
                  setEntryToDisable(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('detail_hub.timecard.disable_dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('detail_hub.timecard.photo_viewer.title')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Photo Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail_hub.timecard.photo_viewer.employee')}</p>
                  <p className="font-medium">{selectedPhoto.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{selectedPhoto.employeeNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail_hub.timecard.photo_viewer.timestamp')}</p>
                  <p className="font-medium">{selectedPhoto.timestamp}</p>
                  <Badge variant="outline" className={selectedPhoto.type === 'clock_in' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                    {selectedPhoto.type === 'clock_in' ? t('detail_hub.timecard.photo_viewer.clock_in') : t('detail_hub.timecard.photo_viewer.clock_out')}
                  </Badge>
                </div>

                {/* Additional Location Info */}
                {(() => {
                  const fullEntry = filteredTimeEntries.find(e => e.id === selectedPhoto.timeEntryId);
                  if (!fullEntry) return null;

                  return (
                    <>
                      {fullEntry.kiosk_id && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('detail_hub.timecard.photo_viewer.kiosk')}</p>
                          <p className="font-medium text-sm">{fullEntry.kiosk_id}</p>
                        </div>
                      )}
                      {fullEntry.ip_address && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('detail_hub.timecard.photo_viewer.location')}</p>
                          <p className="font-medium text-sm">{fullEntry.ip_address}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Photo Display */}
              <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
                <img
                  src={selectedPhoto.url}
                  alt="Time clock photo"
                  className="max-w-full max-h-[60vh] rounded-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-employee.png';
                  }}
                />
              </div>

              {/* Photo Metadata Footer */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-500" />
                  <span className="text-muted-foreground">
                    {t('detail_hub.timecard.photo_viewer.method')}: <span className="font-medium text-gray-700">{selectedPhoto.method}</span>
                  </span>
                </div>
                {(() => {
                  const fullEntry = filteredTimeEntries.find(e => e.id === selectedPhoto.timeEntryId);
                  if (!fullEntry) return null;

                  return (
                    <div className="text-muted-foreground">
                      {t('detail_hub.timecard.photo_viewer.captured_at')}: <span className="font-medium text-gray-700">{format(new Date(fullEntry.created_at), 'MMMM d, yyyy h:mm a')}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TimecardSystem;