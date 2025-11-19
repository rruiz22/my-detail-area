import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CalendarIcon, Download, FileDown, Table as TableIcon, Clock, DollarSign, Users, Target, FileText } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useDealerFilter } from "@/contexts/DealerFilterContext";
import {
  useHoursByEmployee,
  useHoursByDepartment,
  useAttendancePatterns,
  useProductivityMetrics,
  getDateRanges
} from "@/hooks/useDetailHubAnalytics";
import {
  exportReportToPDF,
  exportReportToExcel
} from "@/utils/reportExporters";
import {
  createPayrollReport,
  createAttendanceReport,
  createDepartmentReport,
  createProductivityReport
} from "@/utils/reportTemplates";

const ReportsCenter = () => {
  const { t } = useTranslation();
  const { selectedDealerId, selectedDealer } = useDealerFilter();

  // Date range state (default: last 30 days)
  const [dateRange, setDateRange] = useState(() => getDateRanges.last30Days());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch real analytics data
  const { data: employeeHours = [], isLoading: isLoadingEmployees } = useHoursByEmployee(dateRange);
  const { data: departmentHours = [], isLoading: isLoadingDepartments } = useHoursByDepartment(dateRange);
  const { data: attendanceData = [], isLoading: isLoadingAttendance } = useAttendancePatterns(dateRange);
  const { data: productivityMetrics, isLoading: isLoadingMetrics } = useProductivityMetrics(dateRange);

  const dealershipName = selectedDealer?.name || 'All Dealerships';

  // =============================
  // EXPORT HANDLERS
  // =============================

  const handleExportPayrollPDF = () => {
    try {
      const reportData = createPayrollReport(employeeHours, dateRange, dealershipName);
      exportReportToPDF(reportData);
      toast.success(t('detail_hub.reports.export_pdf'), {
        description: t('detail_hub.reports.pdf_exported')
      });
    } catch (error) {
      console.error('Failed to export payroll PDF:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportPayrollExcel = () => {
    try {
      const reportData = createPayrollReport(employeeHours, dateRange, dealershipName);
      exportReportToExcel(reportData);
      toast.success(t('detail_hub.reports.export_excel'), {
        description: t('detail_hub.reports.excel_exported')
      });
    } catch (error) {
      console.error('Failed to export payroll Excel:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportAttendancePDF = () => {
    try {
      const reportData = createAttendanceReport(attendanceData, dateRange, dealershipName);
      exportReportToPDF(reportData);
      toast.success(t('detail_hub.reports.export_pdf'));
    } catch (error) {
      console.error('Failed to export attendance PDF:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportAttendanceExcel = () => {
    try {
      const reportData = createAttendanceReport(attendanceData, dateRange, dealershipName);
      exportReportToExcel(reportData);
      toast.success(t('detail_hub.reports.export_excel'));
    } catch (error) {
      console.error('Failed to export attendance Excel:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportDepartmentPDF = () => {
    try {
      const reportData = createDepartmentReport(departmentHours, dateRange, dealershipName);
      exportReportToPDF(reportData);
      toast.success(t('detail_hub.reports.export_pdf'));
    } catch (error) {
      console.error('Failed to export department PDF:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportDepartmentExcel = () => {
    try {
      const reportData = createDepartmentReport(departmentHours, dateRange, dealershipName);
      exportReportToExcel(reportData);
      toast.success(t('detail_hub.reports.export_excel'));
    } catch (error) {
      console.error('Failed to export department Excel:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportProductivityPDF = () => {
    if (!productivityMetrics) return;
    try {
      const reportData = createProductivityReport(productivityMetrics, dateRange, dealershipName);
      exportReportToPDF(reportData);
      toast.success(t('detail_hub.reports.export_pdf'));
    } catch (error) {
      console.error('Failed to export productivity PDF:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  const handleExportProductivityExcel = () => {
    if (!productivityMetrics) return;
    try {
      const reportData = createProductivityReport(productivityMetrics, dateRange, dealershipName);
      exportReportToExcel(reportData);
      toast.success(t('detail_hub.reports.export_excel'));
    } catch (error) {
      console.error('Failed to export productivity Excel:', error);
      toast.error(t('detail_hub.reports.export_failed'));
    }
  };

  // Calculate monthly stats from real data
  const monthlyStats = {
    totalHours: productivityMetrics?.total_hours || 0,
    totalEmployees: productivityMetrics?.total_employees || 0,
    activeEmployees: productivityMetrics?.active_employees || 0,
    overtimeHours: productivityMetrics?.total_overtime_hours || 0,
    avgEfficiency: 90, // TODO: Calculate from actual data when available
    avgHoursPerEmployee: productivityMetrics?.avg_hours_per_employee || 0
  };

  const isLoading = isLoadingEmployees || isLoadingDepartments || isLoadingAttendance || isLoadingMetrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.reports.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="p-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange(getDateRanges.last7Days())}
                >
                  {t('detail_hub.analytics.last_7_days')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange(getDateRanges.last30Days())}
                >
                  {t('detail_hub.analytics.last_30_days')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange(getDateRanges.currentMonth())}
                >
                  Current Month
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{monthlyStats.totalHours.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.dashboard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{monthlyStats.activeEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Hours/Employee</p>
                <p className="text-2xl font-bold">{monthlyStats.avgHoursPerEmployee.toFixed(1)}</p>
              </div>
              <Target className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                <p className="text-2xl font-bold">{monthlyStats.overtimeHours.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards with Export */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payroll Report */}
        <Card className="card-enhanced">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('detail_hub.reports.payroll_report')}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPayrollPDF}
                  disabled={isLoading || employeeHours.length === 0}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_pdf')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPayrollExcel}
                  disabled={isLoading || employeeHours.length === 0}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_excel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Employee hours breakdown with regular and overtime calculations
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Employees:</span>
                <span className="font-medium">{employeeHours.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Hours:</span>
                <span className="font-medium">
                  {employeeHours.reduce((acc, e) => acc + e.total_hours, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Report */}
        <Card className="card-enhanced">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('detail_hub.reports.attendance_report')}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAttendancePDF}
                  disabled={isLoading || attendanceData.length === 0}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_pdf')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAttendanceExcel}
                  disabled={isLoading || attendanceData.length === 0}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_excel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Daily attendance patterns and punch tracking
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Days:</span>
                <span className="font-medium">{attendanceData.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Punches:</span>
                <span className="font-medium">
                  {attendanceData.reduce((acc, d) => acc + d.total_entries, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Report */}
        <Card className="card-enhanced">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Department Hours Report</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDepartmentPDF}
                  disabled={isLoading || departmentHours.length === 0}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_pdf')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDepartmentExcel}
                  disabled={isLoading || departmentHours.length === 0}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_excel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Hours breakdown by department with employee counts
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Departments:</span>
                <span className="font-medium">{departmentHours.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Hours:</span>
                <span className="font-medium">
                  {departmentHours.reduce((acc, d) => acc + d.total_hours, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productivity Report */}
        <Card className="card-enhanced">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('detail_hub.reports.productivity_report')}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportProductivityPDF}
                  disabled={isLoading || !productivityMetrics}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_pdf')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportProductivityExcel}
                  disabled={isLoading || !productivityMetrics}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  {t('detail_hub.reports.export_excel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Key performance indicators and productivity metrics
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Employees:</span>
                <span className="font-medium">{productivityMetrics?.active_employees || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Overtime %:</span>
                <span className="font-medium">
                  {productivityMetrics?.overtime_percentage.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsCenter;