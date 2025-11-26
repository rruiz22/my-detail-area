import { useState } from "react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, Filter, Clock, User, DollarSign, AlertTriangle, Camera, Image as ImageIcon, Plus, FileText, Edit2, Ban, X, Search, FileSpreadsheet, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
// Real database integration (NO MOCK DATA)
import { usePendingReviews, useApproveTimeEntry, useRejectTimeEntry, TimeEntryWithEmployee, useDetailHubTimeEntries, useDetailHubEmployees, useDisableTimeEntry } from "@/hooks/useDetailHubDatabase";
import { PhotoReviewCard } from "./PhotoReviewCard";
import { ManualTimeEntryModal } from "./ManualTimeEntryModal";
import { TimeEntryLogsModal } from "./TimeEntryLogsModal";
import { EditTimeEntryModal } from "./EditTimeEntryModal";
import { EmployeeTimecardDetailModal } from "./EmployeeTimecardDetailModal";
import { DisabledEntriesModal } from "./DisabledEntriesModal";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useTimecardPersistence, type DateFilter } from "@/hooks/useTimecardPersistence";
import { exportReportToPDF, exportReportToExcel } from "@/utils/reportExporters";
import { createTimecardReport, createWeeklySummaryReport, type TimecardEntry, type TimecardSummary } from "@/utils/timecardExportUtils";

/**
 * Timecard System - Real Database Integration
 * Displays employee time entries with photo thumbnails and date filtering
 */
const TimecardSystem = () => {
  const { t } = useTranslation();

  // Persisted state with localStorage
  const [activeTab, setActiveTab] = useTabPersistence('detail_hub_timecard', 'daily');
  const {
    filters,
    setFilters,
    clearAdvancedFilters,
    getActiveFiltersCount: getActiveFiltersCountFromHook
  } = useTimecardPersistence();

  // Extract filters for easier access
  const {
    dateFilter,
    customDateRange,
    searchQuery,
    selectedEmployeeId,
    selectedStatus,
    selectedMethod,
    showAdvancedFilters
  } = filters;

  // Non-persisted local state
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
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false);
  const [showDisabledEntriesModal, setShowDisabledEntriesModal] = useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<{
    id: string;
    name: string;
    number: string;
    hourlyRate: number;
  } | null>(null);

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

  // Get date range based on filter (UTC-aware to prevent timezone issues)
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return { start: today, end: today };

      case 'this_week': {
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, Monday = 0 days

        const monday = new Date(today);
        monday.setDate(today.getDate() - daysFromMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return { start: monday, end: sunday };
      }

      case 'last_week': {
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Go to last week's Monday (current Monday - 7 days)
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysFromMonday - 7);

        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);

        return { start: lastMonday, end: lastSunday };
      }

      case 'custom': {
        // Use custom date range (from - to)
        const startDate = customDateRange.from || today;
        const endDate = customDateRange.to || customDateRange.from || today;
        return { start: startDate, end: endDate };
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

    // Format date in local timezone (not UTC) to prevent off-by-one day errors
    const clockInDate = new Date(entry.clock_in);
    const localDateString = `${clockInDate.getFullYear()}-${String(clockInDate.getMonth() + 1).padStart(2, '0')}-${String(clockInDate.getDate()).padStart(2, '0')}`;

    return {
      id: entry.id, // Use unique time entry ID as key
      employeeId: entry.employee_number || 'N/A',
      employeeName: entry.employee_name,
      date: localDateString,
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

  // Filter and transform time entries based on selected date range AND advanced filters
  const filteredTimeEntries = (() => {
    // Create start of day (00:00:00) and end of day (23:59:59) timestamps
    const startOfDay = new Date(dateRange.start);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateRange.end);
    endOfDay.setHours(23, 59, 59, 999);

    return timeEntries.filter(entry => {
      // Date filter - compare actual timestamps instead of string comparison
      const entryTimestamp = new Date(entry.clock_in);
      if (entryTimestamp < startOfDay || entryTimestamp > endOfDay) {
        return false;
      }

      // Search filter (name or employee number)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = entry.employee_name?.toLowerCase().includes(query);
        const matchesNumber = entry.employee_number?.toLowerCase().includes(query);
        if (!matchesName && !matchesNumber) {
          return false;
        }
      }

      // Employee filter
      if (selectedEmployeeId !== "all" && entry.employee_id !== selectedEmployeeId) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && entry.status !== selectedStatus) {
        return false;
      }

      // Method filter (punch_in_method or punch_out_method)
      if (selectedMethod !== "all") {
        const matchesInMethod = entry.punch_in_method === selectedMethod;
        const matchesOutMethod = entry.punch_out_method === selectedMethod;
        if (!matchesInMethod && !matchesOutMethod) {
          return false;
        }
      }

      return true;
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

    // Count unique employees (all statuses)
    const allEmployeeIds = new Set(
      filteredTimeEntries.map(entry => entry.employee_id)
    );

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
      totalEmployees: allEmployeeIds.size, // All unique employees
      activeEmployees: activeEmployeeIds.size, // Only active employees
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
        return <Badge className="bg-green-100 text-green-800 text-xs py-0">{t('detail_hub.timecard.status_badges.complete')}</Badge>;
      case "Clocked In":
        return <Badge className="bg-blue-100 text-blue-800 text-xs py-0">{t('detail_hub.timecard.status_badges.active')}</Badge>;
      case "Late":
        return <Badge className="bg-red-100 text-red-800 text-xs py-0">{t('detail_hub.timecard.status_badges.late')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs py-0">{status}</Badge>;
    }
  };

  // Helper: Count active filters (use hook method)
  const getActiveFiltersCount = getActiveFiltersCountFromHook;

  // =============================
  // EXPORT HANDLERS
  // =============================

  /**
   * Export daily/weekly timecard report to PDF
   */
  const handleExportPDF = () => {
    try {
      // Transform timecard data to export format
      const exportEntries: TimecardEntry[] = timecards.map((tc) => ({
        employeeId: tc.employeeId,
        employeeName: tc.employeeName,
        date: tc.date,
        clockIn: tc.clockIn,
        clockOut: tc.clockOut,
        breakTimes: `${tc.breakStart} - ${tc.breakEnd}`,
        totalHours: tc.totalHours,
        regularHours: tc.regularHours,
        overtimeHours: tc.overtimeHours,
        hourlyRate: tc.hourlyRate,
        totalPay: tc.totalPay,
        status: tc.status
      }));

      // Calculate total regular hours (sum of all entries)
      const totalRegularHours = timecards.reduce((sum, tc) => sum + tc.regularHours, 0);

      // Create summary
      const exportSummary: TimecardSummary = {
        totalHours: stats.totalHours,
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalOvertimeHours: stats.overtimeHours,
        totalPayroll: stats.totalPayroll,
        totalEmployees: stats.totalEmployees,
        activeEmployees: stats.activeEmployees,
        totalEntries: stats.filteredCount,
        averageHoursPerEmployee: stats.totalEmployees > 0
          ? Math.round((stats.totalHours / stats.totalEmployees) * 100) / 100
          : 0
      };

      // Use weekly summary if in weekly/monthly tab, otherwise daily report
      const reportData = (activeTab === 'weekly' || activeTab === 'monthly')
        ? createWeeklySummaryReport(exportEntries, exportSummary, dateRange, 'MyDetailArea')
        : createTimecardReport(exportEntries, exportSummary, dateRange, 'MyDetailArea');

      exportReportToPDF(reportData);

      toast.success(t('detail_hub.timecard.export_success'), {
        description: t('detail_hub.timecard.pdf_downloaded')
      });
    } catch (error) {
      console.error('Failed to export timecard PDF:', error);
      toast.error(t('detail_hub.timecard.export_failed'));
    }
  };

  /**
   * Export daily/weekly timecard report to Excel
   */
  const handleExportExcel = async () => {
    try {
      // Transform timecard data to export format (same as PDF)
      const exportEntries: TimecardEntry[] = timecards.map((tc) => ({
        employeeId: tc.employeeId,
        employeeName: tc.employeeName,
        date: tc.date,
        clockIn: tc.clockIn,
        clockOut: tc.clockOut,
        breakTimes: `${tc.breakStart} - ${tc.breakEnd}`,
        totalHours: tc.totalHours,
        regularHours: tc.regularHours,
        overtimeHours: tc.overtimeHours,
        hourlyRate: tc.hourlyRate,
        totalPay: tc.totalPay,
        status: tc.status
      }));

      const totalRegularHours = timecards.reduce((sum, tc) => sum + tc.regularHours, 0);

      const exportSummary: TimecardSummary = {
        totalHours: stats.totalHours,
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalOvertimeHours: stats.overtimeHours,
        totalPayroll: stats.totalPayroll,
        totalEmployees: stats.totalEmployees,
        activeEmployees: stats.activeEmployees,
        totalEntries: stats.filteredCount,
        averageHoursPerEmployee: stats.totalEmployees > 0
          ? Math.round((stats.totalHours / stats.totalEmployees) * 100) / 100
          : 0
      };

      const reportData = (activeTab === 'weekly' || activeTab === 'monthly')
        ? createWeeklySummaryReport(exportEntries, exportSummary, dateRange, 'MyDetailArea')
        : createTimecardReport(exportEntries, exportSummary, dateRange, 'MyDetailArea');

      await exportReportToExcel(reportData);

      toast.success(t('detail_hub.timecard.export_success'), {
        description: t('detail_hub.timecard.excel_downloaded')
      });
    } catch (error) {
      console.error('Failed to export timecard Excel:', error);
      toast.error(t('detail_hub.timecard.export_failed'));
    }
  };

  // Helper: Group timecards by date (for weekly views)
  // Uses raw time entries instead of transformed timecards to avoid parsing formatted strings
  const groupTimecardsByDate = () => {
    const grouped = new Map<string, typeof timecards>();

    filteredTimeEntries.forEach(entry => {
      // Validate clock_in exists
      if (!entry.clock_in) {
        return; // Skip invalid entries
      }

      try {
        const clockInDate = new Date(entry.clock_in);
        // Check if date is valid
        if (isNaN(clockInDate.getTime())) {
          return;
        }

        // Use local timezone date formatting (same as transformTimeEntry)
        const localDateString = `${clockInDate.getFullYear()}-${String(clockInDate.getMonth() + 1).padStart(2, '0')}-${String(clockInDate.getDate()).padStart(2, '0')}`;

        if (!grouped.has(localDateString)) {
          grouped.set(localDateString, []);
        }
        // Transform and add to group
        grouped.get(localDateString)!.push(transformTimeEntry(entry));
      } catch (error) {
        console.error('Error grouping time entry:', entry.id, error);
      }
    });

    // Sort by date descending (most recent first)
    return Array.from(grouped.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
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
              onClick={() => setFilters({ dateFilter: 'today' })}
            >
              {t('detail_hub.timecard.filters.today')}
            </Button>
            <Button
              variant={dateFilter === 'this_week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilters({ dateFilter: 'this_week' })}
            >
              {t('detail_hub.timecard.filters.this_week')}
            </Button>
            <Button
              variant={dateFilter === 'last_week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilters({ dateFilter: 'last_week' })}
            >
              {t('detail_hub.timecard.filters.last_week')}
            </Button>
          </div>

          {/* Custom Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setFilters({ dateFilter: 'custom' })}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateFilter === 'custom' && customDateRange.from ? (
                  customDateRange.to ? (
                    `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`
                  ) : (
                    format(customDateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  t('detail_hub.timecard.filters.custom_date')
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={(range) => {
                  if (range) {
                    setFilters({
                      customDateRange: range,
                      dateFilter: 'custom'
                    });
                  }
                }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={() => setShowManualEntryModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.manual_entry.add_button')}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowDisabledEntriesModal(true)}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            title="Manage disabled entries to prevent overlap errors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Disabled Entries
          </Button>

          <Button variant={showAdvancedFilters ? "default" : "outline"} onClick={() => setFilters({ showAdvancedFilters: !showAdvancedFilters })}>
            <Filter className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.filters.advanced_filters')}
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                {t('detail_hub.timecard.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                {t('detail_hub.timecard.export_pdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('detail_hub.timecard.export_excel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('detail_hub.timecard.filters.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setFilters({ searchQuery: e.target.value })}
                  className="pl-10"
                />
              </div>

              {/* Employee Filter */}
              <Select value={selectedEmployeeId} onValueChange={(val) => setFilters({ selectedEmployeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('detail_hub.timecard.filters.all_employees')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('detail_hub.timecard.filters.all_employees')}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={(val) => setFilters({ selectedStatus: val })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('detail_hub.timecard.filters.all_statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('detail_hub.timecard.filters.all_statuses')}</SelectItem>
                  <SelectItem value="active">{t('detail_hub.timecard.filters.status.active')}</SelectItem>
                  <SelectItem value="complete">{t('detail_hub.timecard.filters.status.complete')}</SelectItem>
                  <SelectItem value="disputed">{t('detail_hub.timecard.filters.status.disputed')}</SelectItem>
                  <SelectItem value="approved">{t('detail_hub.timecard.filters.status.approved')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Method Filter */}
              <Select value={selectedMethod} onValueChange={(val) => setFilters({ selectedMethod: val })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('detail_hub.timecard.filters.all_methods')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('detail_hub.timecard.filters.all_methods')}</SelectItem>
                  <SelectItem value="face">{t('detail_hub.timecard.filters.methods.face')}</SelectItem>
                  <SelectItem value="pin">{t('detail_hub.timecard.filters.methods.pin')}</SelectItem>
                  <SelectItem value="manual">{t('detail_hub.timecard.filters.methods.manual')}</SelectItem>
                  <SelectItem value="photo_fallback">{t('detail_hub.timecard.filters.methods.photo_fallback')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {getActiveFiltersCount() > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-indigo-200">
                <p className="text-sm text-muted-foreground">
                  {t('detail_hub.timecard.filters.filters_active', { count: getActiveFiltersCount() })}
                </p>
                <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                  <X className="w-4 h-4 mr-2" />
                  {t('detail_hub.timecard.filters.clear_all')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Real-time Stats from Database */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-medium text-indigo-900">{t('detail_hub.timecard.stats.total_hours')}</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.totalHours.toFixed(2)}h</p>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">{t('detail_hub.timecard.stats.overtime_hours')}</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours.toFixed(2)}h</p>
        </div>
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-medium text-violet-900">{t('detail_hub.timecard.stats.employees')}</p>
          </div>
          <p className="text-2xl font-bold text-violet-600">{stats.totalEmployees}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">{t('detail_hub.timecard.stats.active_employees')}</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.activeEmployees}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium text-green-900">{t('detail_hub.timecard.stats.total_payroll')}</p>
          </div>
          <p className="text-2xl font-bold text-green-600">${stats.totalPayroll.toFixed(2)}</p>
        </div>
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
                    employee_number: entry.employee_number,      // ✨ ADD: Show employee number
                    clock_in: entry.clock_in,
                    clock_out: entry.clock_out,                  // ✨ ADD: Show punch out if exists
                    total_hours: entry.total_hours,              // ✨ ADD: Show total hours
                    punch_in_method: 'photo_fallback',
                    photo_in_url: entry.photo_in_url!,
                    photo_out_url: entry.photo_out_url,          // ✨ ADD: For future use
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                {dateFilter === 'custom' && customDateRange.from && (
                  customDateRange.to
                    ? `${t('detail_hub.timecard.daily_timecards')} (${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d, yyyy')})`
                    : `${t('detail_hub.timecard.daily_timecards')} - ${format(customDateRange.from, "MMMM d, yyyy")}`
                )}
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
                  ) : (dateFilter === 'this_week' || dateFilter === 'last_week' || dateFilter === 'custom') ? (
                    // Grouped by date for weekly views and custom ranges
                    groupTimecardsByDate().map(([date, dateTimecards]) => {
                      // Parse date parts to avoid timezone issues
                      const [year, month, day] = date.split('-').map(Number);
                      const localDate = new Date(year, month - 1, day); // Create local date

                      // Calculate daily totals
                      const dailyTotalHours = dateTimecards.reduce((sum, tc) => sum + tc.totalHours, 0);
                      const dailyOvertimeHours = dateTimecards.reduce((sum, tc) => sum + tc.overtimeHours, 0);
                      const dailyTotalPay = dateTimecards.reduce((sum, tc) => sum + tc.totalPay, 0);

                      return (
                      <React.Fragment key={`group-${date}`}>
                        {/* Date Header Row with Daily Totals */}
                        <TableRow key={`header-${date}`} className="bg-gray-200 hover:bg-gray-200 border-y border-gray-300">
                          <TableCell colSpan={10} className="font-semibold text-gray-800 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                📅 {format(localDate, 'EEEE, MMMM d, yyyy')}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                  ({dateTimecards.length} {dateTimecards.length === 1 ? 'entry' : 'entries'})
                                </span>
                              </div>
                              <div className="flex items-center gap-6 text-sm font-normal">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="font-semibold text-blue-600">{dailyTotalHours.toFixed(2)}h</span>
                                </div>
                                {dailyOvertimeHours > 0 && (
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    <span className="text-muted-foreground">OT:</span>
                                    <span className="font-semibold text-orange-600">{dailyOvertimeHours.toFixed(2)}h</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="text-muted-foreground">Pay:</span>
                                  <span className="font-semibold text-green-600">${dailyTotalPay.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Entries for this date */}
                        {dateTimecards.map((timecard) => (
                      <TableRow
                        key={timecard.id}
                        onDoubleClick={() => {
                          const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                          if (fullEntry) {
                            setSelectedTimeEntry(fullEntry);
                            setShowEditModal(true);
                          }
                        }}
                        className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                      >
                      <TableCell className="py-2">
                        <div className="leading-tight">
                          <p className="font-medium text-sm">{timecard.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{timecard.employeeId}</p>
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
                                className="w-8 h-8 rounded object-cover border-2 border-green-500 hover:border-green-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchInMethod === 'photo_fallback' ? (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-3 h-3 text-gray-400" />
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
                                className="w-8 h-8 rounded object-cover border-2 border-red-500 hover:border-red-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchOutMethod === 'photo_fallback' && timecard.clockOut !== '--' ? (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-3 h-3 text-gray-400" />
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{timecard.clockIn}</TableCell>
                      <TableCell className="py-2 text-sm">{timecard.clockOut}</TableCell>
                      <TableCell className="py-2 text-sm">
                        {timecard.breakStart} - {timecard.breakEnd}
                      </TableCell>
                      <TableCell className="py-2 text-sm">{timecard.totalHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}</TableCell>
                      <TableCell className="py-2">
                        {timecard.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium text-sm">
                            {timecard.overtimeHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}
                          </span>
                        ) : (
                          <span className="text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm">${timecard.totalPay.toFixed(2)}</TableCell>
                      <TableCell className="py-2">{getStatusBadge(timecard.status)}</TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowLogsModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.view_logs')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <FileText className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowEditModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.edit')}
                            className="p-1 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntryToDisable(timecard.id);
                              setShowDisableDialog(true);
                            }}
                            title={t('detail_hub.timecard.actions.disable')}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <Ban className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                        ))}
                      </React.Fragment>
                      );
                    })
                  ) : (
                    // Normal view for today/custom date (no grouping)
                    timecards.map((timecard) => (
                      <TableRow
                        key={timecard.id}
                        onDoubleClick={() => {
                          const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                          if (fullEntry) {
                            setSelectedTimeEntry(fullEntry);
                            setShowEditModal(true);
                          }
                        }}
                        className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                      >
                      <TableCell className="py-2">
                        <div className="leading-tight">
                          <p className="font-medium text-sm">{timecard.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{timecard.employeeId}</p>
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
                                className="w-8 h-8 rounded object-cover border-2 border-green-500 hover:border-green-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchInMethod === 'photo_fallback' ? (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-3 h-3 text-gray-400" />
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
                                className="w-8 h-8 rounded object-cover border-2 border-red-500 hover:border-red-600 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-employee.png';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-white" />
                              </div>
                            </button>
                          ) : timecard.punchOutMethod === 'photo_fallback' && timecard.clockOut !== '--' ? (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                              <Camera className="w-3 h-3 text-gray-400" />
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{timecard.clockIn}</TableCell>
                      <TableCell className="py-2 text-sm">{timecard.clockOut}</TableCell>
                      <TableCell className="py-2 text-sm">
                        {timecard.breakStart} - {timecard.breakEnd}
                      </TableCell>
                      <TableCell className="py-2 text-sm">{timecard.totalHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}</TableCell>
                      <TableCell className="py-2">
                        {timecard.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium text-sm">
                            {timecard.overtimeHours.toFixed(2)}{t('detail_hub.timecard.table.hours_abbr')}
                          </span>
                        ) : (
                          <span className="text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm">${timecard.totalPay.toFixed(2)}</TableCell>
                      <TableCell className="py-2">{getStatusBadge(timecard.status)}</TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowLogsModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.view_logs')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <FileText className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullEntry = filteredTimeEntries.find(e => e.id === timecard.id);
                              if (fullEntry) {
                                setSelectedTimeEntry(fullEntry);
                                setShowEditModal(true);
                              }
                            }}
                            title={t('detail_hub.timecard.actions.edit')}
                            className="p-1 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntryToDisable(timecard.id);
                              setShowDisableDialog(true);
                            }}
                            title={t('detail_hub.timecard.actions.disable')}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <Ban className="w-3 h-3 text-red-600" />
                          </button>
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
              <CardTitle>
                {dateFilter === 'today' && 'Today\'s Summary'}
                {dateFilter === 'this_week' && `${t('detail_hub.timecard.filters.this_weeks_timecards')} (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')})`}
                {dateFilter === 'last_week' && `${t('detail_hub.timecard.filters.last_weeks_timecards')} (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')})`}
                {dateFilter === 'custom' && customDateRange.from && (
                  customDateRange.to
                    ? `Weekly Summary (${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d, yyyy')})`
                    : `Summary - ${format(customDateRange.from, "MMMM d, yyyy")}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Employee Breakdown Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold text-right">Days Worked</TableHead>
                      <TableHead className="font-semibold text-right">Regular Hours</TableHead>
                      <TableHead className="font-semibold text-right">Overtime</TableHead>
                      <TableHead className="font-semibold text-right">Total Hours</TableHead>
                      <TableHead className="font-semibold text-right">Hourly Rate</TableHead>
                      <TableHead className="font-semibold text-right">Total Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group entries by employee
                      const employeeMap = new Map<string, {
                        id: string;
                        name: string;
                        employeeNumber: string;
                        regularHours: number;
                        overtimeHours: number;
                        totalHours: number;
                        hourlyRate: number;
                        totalPay: number;
                        daysWorked: number;
                      }>();

                      filteredTimeEntries.forEach(entry => {
                        const employeeId = entry.employee_id;
                        const existing = employeeMap.get(employeeId);
                        const hourlyRate = employeeRates[employeeId] || 0;

                        const regularPay = (entry.regular_hours || 0) * hourlyRate;
                        const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5;

                        if (existing) {
                          existing.regularHours += entry.regular_hours || 0;
                          existing.overtimeHours += entry.overtime_hours || 0;
                          existing.totalHours += entry.total_hours || 0;
                          existing.totalPay += regularPay + overtimePay;
                          existing.daysWorked += 1;
                        } else {
                          employeeMap.set(employeeId, {
                            id: employeeId,
                            name: entry.employee_name,
                            employeeNumber: entry.employee_number || 'N/A',
                            regularHours: entry.regular_hours || 0,
                            overtimeHours: entry.overtime_hours || 0,
                            totalHours: entry.total_hours || 0,
                            hourlyRate: hourlyRate,
                            totalPay: regularPay + overtimePay,
                            daysWorked: 1
                          });
                        }
                      });

                      // Convert to array and sort by total hours (descending)
                      const employeeData = Array.from(employeeMap.values())
                        .sort((a, b) => b.totalHours - a.totalHours);

                      if (employeeData.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">No employee data for this period</p>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return employeeData.map((emp, index) => (
                        <TableRow
                          key={emp.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onDoubleClick={() => {
                            setSelectedEmployeeForDetail({
                              id: emp.id,
                              name: emp.name,
                              number: emp.employeeNumber,
                              hourlyRate: emp.hourlyRate
                            });
                            setShowEmployeeDetailModal(true);
                          }}
                          title="Double-click to view employee details"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{emp.name}</p>
                              <p className="text-sm text-muted-foreground">{emp.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{emp.daysWorked}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {emp.regularHours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {emp.overtimeHours > 0 ? (
                              <span className="font-medium text-orange-600">
                                {emp.overtimeHours.toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {emp.totalHours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${emp.hourlyRate.toFixed(2)}/h
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ${emp.totalPay.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                    {/* Totals Row */}
                    {filteredTimeEntries.length > 0 && (
                      <TableRow className="bg-gray-200 font-semibold border-t-2 border-gray-300">
                        <TableCell>TOTALS</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {new Set(filteredTimeEntries.map(e => e.employee_id)).size} employees
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-gray-800">
                          {filteredTimeEntries.reduce((sum, e) => sum + (e.regular_hours || 0), 0).toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {filteredTimeEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0).toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {filteredTimeEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          --
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ${filteredTimeEntries.reduce((sum, entry) => {
                            const hourlyRate = employeeRates[entry.employee_id] || 0;
                            const regularPay = (entry.regular_hours || 0) * hourlyRate;
                            const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5;
                            return sum + regularPay + overtimePay;
                          }, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

      {/* Disabled Entries Management Modal */}
      <DisabledEntriesModal
        open={showDisabledEntriesModal}
        onClose={() => setShowDisabledEntriesModal(false)}
        onEntriesDeleted={() => {
          // Refresh time entries after deletion
          // This will be handled by TanStack Query refetch
        }}
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

      {/* Employee Timecard Detail Modal */}
      {selectedEmployeeForDetail && (
        <EmployeeTimecardDetailModal
          open={showEmployeeDetailModal}
          onOpenChange={setShowEmployeeDetailModal}
          employeeId={selectedEmployeeForDetail.id}
          employeeName={selectedEmployeeForDetail.name}
          employeeNumber={selectedEmployeeForDetail.number}
          hourlyRate={selectedEmployeeForDetail.hourlyRate}
          dateRange={dateRange}
          timeEntries={filteredTimeEntries.filter(e => e.employee_id === selectedEmployeeForDetail.id)}
          onPhotoClick={(photo) => setSelectedPhoto(photo)}
        />
      )}

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