import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  AlertTriangle,
  DollarSign,
  Coffee,
  Camera,
  ImageIcon,
  User,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { TimeEntryWithEmployee } from "@/hooks/useDetailHubDatabase";

interface EmployeeTimecardDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  hourlyRate: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  timeEntries: TimeEntryWithEmployee[];
  onPhotoClick?: (photo: {
    url: string;
    employeeName: string;
    employeeNumber: string;
    timestamp: string;
    type: 'clock_in' | 'clock_out';
    method: string;
    timeEntryId: string;
  }) => void;
}

export function EmployeeTimecardDetailModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  employeeNumber,
  hourlyRate,
  dateRange,
  timeEntries,
  onPhotoClick
}: EmployeeTimecardDetailModalProps) {
  const { t } = useTranslation();

  // 🔒 PRIVACY: Track if hourly rate is visible
  const [showHourlyRate, setShowHourlyRate] = useState(false);

  // Calculate employee statistics
  const stats = useMemo(() => {
    const daysWorked = timeEntries.length;
    const regularHours = timeEntries.reduce((sum, entry) => sum + (entry.regular_hours || 0), 0);
    const overtimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);

    // Calculate total pay (regular + overtime at 1.5x)
    const totalPay = timeEntries.reduce((sum, entry) => {
      const regularPay = (entry.regular_hours || 0) * hourlyRate;
      const overtimePay = (entry.overtime_hours || 0) * hourlyRate * 1.5;
      return sum + regularPay + overtimePay;
    }, 0);

    const avgHoursPerDay = daysWorked > 0 ? (regularHours + overtimeHours) / daysWorked : 0;

    return {
      daysWorked,
      regularHours,
      overtimeHours,
      totalPay,
      avgHoursPerDay
    };
  }, [timeEntries, hourlyRate]);

  // Sort entries by date descending (most recent first)
  const sortedEntries = useMemo(() => {
    return [...timeEntries].sort((a, b) => {
      return new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime();
    });
  }, [timeEntries]);

  // Helper: Format time from ISO string
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--';
    try {
      return format(new Date(isoString), 'h:mm a');
    } catch {
      return '--';
    }
  };

  // Helper: Get employee initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper: Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">{t('detail_hub.timecard.status_badges.complete')}</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">{t('detail_hub.timecard.status_badges.active')}</Badge>;
      case "disputed":
        return <Badge className="bg-orange-100 text-orange-800">{t('detail_hub.timecard.filters.status.disputed')}</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800">{t('detail_hub.timecard.filters.status.approved')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t('detail_hub.timecard.employee_detail.title', { name: employeeName })}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
          </p>
        </DialogHeader>

        {/* Employee Summary Card */}
        <Card className="card-enhanced border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Avatar & Info */}
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16 border-2 border-indigo-300">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
                    {getInitials(employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{employeeName}</h3>
                  <p className="text-sm text-muted-foreground">{employeeNumber}</p>
                  <button
                    onClick={() => setShowHourlyRate(!showHourlyRate)}
                    className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors cursor-pointer group mt-1"
                    title={showHourlyRate ? "Click to hide salary" : "Click to reveal salary"}
                  >
                    {showHourlyRate ? (
                      <>
                        <span className="text-xs font-medium text-emerald-600">
                          ${hourlyRate.toFixed(2)}/hr
                        </span>
                        <EyeOff className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-mono text-gray-400">••••••</span>
                        <Eye className="w-3 h-3 text-gray-400 group-hover:text-emerald-600" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Days Worked */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('detail_hub.timecard.employee_detail.summary.days_worked')}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{stats.daysWorked}</p>
                </div>

                {/* Regular Hours */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('detail_hub.timecard.employee_detail.summary.regular_hours')}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-indigo-600">{stats.regularHours.toFixed(2)}h</p>
                </div>

                {/* Overtime */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('detail_hub.timecard.employee_detail.summary.overtime_hours')}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">{stats.overtimeHours.toFixed(2)}h</p>
                </div>

                {/* Total Pay */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('detail_hub.timecard.employee_detail.summary.total_pay')}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-green-600">${stats.totalPay.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Entries Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3 px-1">
            {t('detail_hub.timecard.employee_detail.daily_entries')}
          </h3>

          {/* Scrollable Entries */}
          <div className="flex-1 overflow-y-auto space-y-2 px-1">
            {sortedEntries.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {t('detail_hub.timecard.employee_detail.no_entries')}
                </p>
              </div>
            ) : (
              sortedEntries.map((entry) => {
                const clockInDate = new Date(entry.clock_in);
                const dailyPay = (entry.regular_hours || 0) * hourlyRate + (entry.overtime_hours || 0) * hourlyRate * 1.5;

                return (
                  <Card key={entry.id} className="card-enhanced hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        {/* Date Badge */}
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg bg-blue-50 flex flex-col items-center justify-center border-2 border-blue-200">
                            <p className="text-xs font-medium text-blue-600 uppercase">
                              {format(clockInDate, 'MMM')}
                            </p>
                            <p className="text-xl font-bold text-blue-700">
                              {format(clockInDate, 'd')}
                            </p>
                          </div>

                          {/* Time Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {/* Clock In with Photo */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t('detail_hub.timecard.employee_detail.breakdown.clock_in')}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{formatTime(entry.clock_in)}</p>
                                {entry.photo_in_url ? (
                                  <button
                                    onClick={() => onPhotoClick?.({
                                      url: entry.photo_in_url!,
                                      employeeName: entry.employee_name,
                                      employeeNumber: entry.employee_number || employeeNumber,
                                      timestamp: formatTime(entry.clock_in),
                                      type: 'clock_in',
                                      method: entry.punch_in_method || 'photo_fallback',
                                      timeEntryId: entry.id
                                    })}
                                    className="relative group"
                                    title="View clock-in photo"
                                  >
                                    <img
                                      src={entry.photo_in_url}
                                      alt="In"
                                      className="w-6 h-6 rounded object-cover border border-green-500 hover:border-green-600 transition-all cursor-pointer"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <Camera className="w-3 h-3 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Clock Out with Photo */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t('detail_hub.timecard.employee_detail.breakdown.clock_out')}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{formatTime(entry.clock_out)}</p>
                                {entry.photo_out_url ? (
                                  <button
                                    onClick={() => onPhotoClick?.({
                                      url: entry.photo_out_url!,
                                      employeeName: entry.employee_name,
                                      employeeNumber: entry.employee_number || employeeNumber,
                                      timestamp: formatTime(entry.clock_out),
                                      type: 'clock_out',
                                      method: entry.punch_out_method || 'photo_fallback',
                                      timeEntryId: entry.id
                                    })}
                                    className="relative group"
                                    title="View clock-out photo"
                                  >
                                    <img
                                      src={entry.photo_out_url}
                                      alt="Out"
                                      className="w-6 h-6 rounded object-cover border border-red-500 hover:border-red-600 transition-all cursor-pointer"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <Camera className="w-3 h-3 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Break */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Coffee className="w-3 h-3" />
                                {t('detail_hub.timecard.employee_detail.breakdown.break_time')}
                              </p>
                              <p className="font-medium">
                                {entry.break_duration_minutes > 0
                                  ? `${entry.break_duration_minutes} min`
                                  : '--'
                                }
                              </p>
                            </div>

                            {/* Total Hours */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t('detail_hub.timecard.employee_detail.breakdown.total_hours')}
                              </p>
                              <p className="font-semibold text-blue-600">
                                {(entry.total_hours || 0).toFixed(2)}h
                                {entry.overtime_hours > 0 && (
                                  <span className="text-xs text-orange-600 ml-1">
                                    (+{entry.overtime_hours.toFixed(2)} OT)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status & Daily Pay */}
                        <div className="flex items-center gap-3 ml-auto">
                          {getStatusBadge(entry.status)}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {t('detail_hub.timecard.employee_detail.breakdown.daily_pay')}
                            </p>
                            <p className="text-lg font-semibold text-green-600">
                              ${dailyPay.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('detail_hub.timecard.employee_detail.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
