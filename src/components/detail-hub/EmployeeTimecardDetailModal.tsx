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
  EyeOff,
  CheckCircle2,
  XCircle,
  Undo2
} from "lucide-react";
import { format } from "date-fns";
import {
  TimeEntryWithEmployee,
  useApproveTimecard,
  useRejectTimecard,
  useBulkApproveTimecards,
  useUnapproveTimecard
} from "@/hooks/useDetailHubDatabase";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditTimeEntryModal } from "./EditTimeEntryModal";
import { toast } from "sonner";

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
  const { enhancedUser } = usePermissions();

  // 🔒 PRIVACY: Track if hourly rate is visible
  const [showHourlyRate, setShowHourlyRate] = useState(false);

  // ⚙️ APPROVAL SYSTEM: Hooks and state
  const approveTimecard = useApproveTimecard();
  const rejectTimecard = useRejectTimecard();
  const bulkApproveTimecards = useBulkApproveTimecards();
  const unapproveTimecard = useUnapproveTimecard();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [timeEntryToReject, setTimeEntryToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // 🔄 UNAPPROVE SYSTEM: State for unapprove confirmation
  const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false);
  const [timeEntryToUnapprove, setTimeEntryToUnapprove] = useState<string | null>(null);

  // ✏️ EDIT SYSTEM: State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeEntryForEdit, setSelectedTimeEntryForEdit] = useState<TimeEntryWithEmployee | null>(null);

  // 🔐 PERMISSION CHECK: Only system_admin and supermanager can approve/edit timecards
  const canApprove = enhancedUser?.is_system_admin || enhancedUser?.is_supermanager;
  const canEdit = enhancedUser?.is_system_admin || enhancedUser?.is_supermanager;

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
        return <Badge className="bg-green-100 text-green-800 text-xs py-0.5 px-2">{t('detail_hub.timecard.status_badges.complete')}</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-800 text-xs py-0.5 px-2">{t('detail_hub.timecard.status_badges.active')}</Badge>;
      case "disputed":
        return <Badge className="bg-orange-100 text-orange-800 text-xs py-0.5 px-2">{t('detail_hub.timecard.filters.status.disputed')}</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 text-xs py-0.5 px-2">{t('detail_hub.timecard.filters.status.approved')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs py-0.5 px-2">{status}</Badge>;
    }
  };

  // Helper: Get approval status badge
  const getApprovalBadge = (approvalStatus: 'pending' | 'approved' | 'rejected') => {
    switch (approvalStatus) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs py-0.5 px-2">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('detail_hub.timecard.approval.status.approved')}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 text-xs py-0.5 px-2">
            <XCircle className="w-3 h-3 mr-1" />
            {t('detail_hub.timecard.approval.status.rejected')}
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs py-0.5 px-2">
            <Clock className="w-3 h-3 mr-1" />
            {t('detail_hub.timecard.approval.status.pending')}
          </Badge>
        );
    }
  };

  // ⚙️ APPROVAL HANDLERS
  const handleApprove = (timeEntryId: string) => {
    approveTimecard.mutate(timeEntryId);
  };

  const handleRejectClick = (timeEntryId: string) => {
    setTimeEntryToReject(timeEntryId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!timeEntryToReject || !rejectionReason.trim()) {
      return;
    }

    rejectTimecard.mutate({
      timeEntryId: timeEntryToReject,
      reason: rejectionReason.trim()
    });

    setRejectDialogOpen(false);
    setTimeEntryToReject(null);
    setRejectionReason("");
  };

  const handleBulkApprove = () => {
    const pendingEntries = timeEntries
      .filter(entry => entry.approval_status === 'pending')
      .map(entry => entry.id);

    if (pendingEntries.length > 0) {
      bulkApproveTimecards.mutate(pendingEntries);
    }
  };

  // 🔄 UNAPPROVE HANDLERS
  const handleUnapproveClick = (timeEntryId: string) => {
    setTimeEntryToUnapprove(timeEntryId);
    setUnapproveDialogOpen(true);
  };

  const handleUnapproveConfirm = () => {
    if (!timeEntryToUnapprove) return;

    unapproveTimecard.mutate(timeEntryToUnapprove);
    setUnapproveDialogOpen(false);
    setTimeEntryToUnapprove(null);
  };

  // ✏️ EDIT HANDLER
  const handleEditEntry = (entry: TimeEntryWithEmployee) => {
    if (!canEdit) {
      toast.error(t('detail_hub.timecard.edit.permission_denied') || "Only admins can edit timecards");
      return;
    }
    setSelectedTimeEntryForEdit(entry);
    setShowEditModal(true);
  };

  // 🎨 VISUAL FEEDBACK: Get card classes based on approval status
  const getEntryCardClasses = (approvalStatus: 'pending' | 'approved' | 'rejected') => {
    switch (approvalStatus) {
      case 'approved':
        return 'bg-emerald-50/50 hover:bg-emerald-50 border-l-4 border-emerald-500';
      case 'rejected':
        return 'bg-red-50/50 hover:bg-red-50 border-l-4 border-red-500';
      case 'pending':
      default:
        return 'bg-gray-50/30 hover:bg-gray-50 border-l-4 border-gray-300';
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
                  <Card
                    key={entry.id}
                    className={`card-enhanced hover:shadow-md transition-all cursor-pointer ${entry.status === 'complete' ? getEntryCardClasses(entry.approval_status) : 'border-l-4 border-gray-300'}`}
                    onDoubleClick={() => handleEditEntry(entry)}
                    title={canEdit ? t('detail_hub.timecard.edit.double_click_hint') || "Double-click to edit (Admin only)" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left Section: Date + Time Details */}
                        <div className="flex items-center gap-3 flex-1">
                          {/* Date Badge */}
                          <div className="w-14 h-14 rounded-lg bg-blue-50 flex flex-col items-center justify-center border-2 border-blue-200 flex-shrink-0">
                            <p className="text-xs font-medium text-blue-600 uppercase">
                              {format(clockInDate, 'MMM')}
                            </p>
                            <p className="text-xl font-bold text-blue-700">
                              {format(clockInDate, 'd')}
                            </p>
                          </div>

                          {/* Time Details Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm flex-1">
                            {/* Clock In with Photo */}
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {t('detail_hub.timecard.employee_detail.breakdown.clock_in')}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-gray-900">{formatTime(entry.clock_in)}</p>
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
                                      className="w-12 h-12 rounded object-cover border-2 border-green-500 hover:border-green-600 transition-all cursor-pointer hover:scale-105"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Clock Out with Photo */}
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {t('detail_hub.timecard.employee_detail.breakdown.clock_out')}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-gray-900">{formatTime(entry.clock_out)}</p>
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
                                      className="w-12 h-12 rounded object-cover border-2 border-red-500 hover:border-red-600 transition-all cursor-pointer hover:scale-105"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Break */}
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1 font-medium">
                                <Coffee className="w-3.5 h-3.5" />
                                {t('detail_hub.timecard.employee_detail.breakdown.break_time')}
                              </p>
                              <p className="text-base font-semibold text-gray-900">
                                {entry.break_duration_minutes > 0
                                  ? `${entry.break_duration_minutes} min`
                                  : '--'
                                }
                              </p>
                            </div>

                            {/* Total Hours */}
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {t('detail_hub.timecard.employee_detail.breakdown.total_hours')}
                              </p>
                              <p className="text-lg font-bold text-blue-600">
                                {(entry.total_hours || 0).toFixed(2)}h
                                {entry.overtime_hours > 0 && (
                                  <span className="text-sm text-orange-600 ml-1 font-semibold">
                                    (+{entry.overtime_hours.toFixed(2)} OT)
                                  </span>
                                )}
                              </p>
                              {/* Status Badge */}
                              <div className="mt-2">
                                {getStatusBadge(entry.status)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Approval Buttons (vertical stack) - For PENDING entries */}
                        {canApprove && entry.status === 'complete' && entry.approval_status === 'pending' && (
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 h-8 px-3 text-xs"
                              onClick={() => handleApprove(entry.id)}
                              disabled={approveTimecard.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {t('detail_hub.timecard.approval.buttons.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300 h-8 px-3 text-xs"
                              onClick={() => handleRejectClick(entry.id)}
                              disabled={rejectTimecard.isPending}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              {t('detail_hub.timecard.approval.buttons.reject')}
                            </Button>
                          </div>
                        )}

                        {/* Unapprove Button - For APPROVED entries */}
                        {canApprove && entry.status === 'complete' && entry.approval_status === 'approved' && (
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 h-8 px-3 text-xs"
                              onClick={() => handleUnapproveClick(entry.id)}
                              disabled={unapproveTimecard.isPending}
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1" />
                              {t('detail_hub.timecard.approval.buttons.unapprove') || 'Unapprove'}
                            </Button>
                          </div>
                        )}

                        {/* Right Section: Approval Status & Daily Pay */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {/* Approval Badge Only */}
                          {entry.status === 'complete' && (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {getApprovalBadge(entry.approval_status)}
                            </div>
                          )}

                          {/* Daily Pay */}
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                              {t('detail_hub.timecard.employee_detail.breakdown.daily_pay')}
                            </p>
                            <p className="text-xl font-bold text-green-600">
                              ${dailyPay.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rejection reason if rejected (full width below) */}
                      {entry.approval_status === 'rejected' && entry.rejection_reason && (
                        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs">
                          <p className="font-semibold text-red-800 mb-1">{t('detail_hub.timecard.approval.dialog.reason_display')}</p>
                          <p className="text-red-700">{entry.rejection_reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          {/* Bulk Approve Button (only for admins with pending entries) */}
          {canApprove && timeEntries.some(e => e.status === 'complete' && e.approval_status === 'pending') ? (
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleBulkApprove}
              disabled={bulkApproveTimecards.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('detail_hub.timecard.approval.buttons.approve_all')} ({timeEntries.filter(e => e.approval_status === 'pending').length})
            </Button>
          ) : (
            <div className="flex-1" />
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('detail_hub.timecard.employee_detail.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Rejection Reason Dialog */}
    <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('detail_hub.timecard.approval.dialog.reject_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('detail_hub.timecard.approval.dialog.reject_description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
            {t('detail_hub.timecard.approval.dialog.reason_label')} *
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder={t('detail_hub.timecard.approval.dialog.reason_placeholder')}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setRejectDialogOpen(false);
            setTimeEntryToReject(null);
            setRejectionReason("");
          }}>
            {t('detail_hub.timecard.approval.dialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRejectConfirm}
            disabled={!rejectionReason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.approval.dialog.confirm_reject')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Unapprove Confirmation Dialog */}
    <AlertDialog open={unapproveDialogOpen} onOpenChange={setUnapproveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('detail_hub.timecard.approval.dialog.unapprove_title') || 'Unapprove Timecard'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('detail_hub.timecard.approval.dialog.unapprove_description') ||
              'This will revert the timecard to pending status. The entry will need to be approved again.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setUnapproveDialogOpen(false);
            setTimeEntryToUnapprove(null);
          }}>
            {t('detail_hub.timecard.approval.dialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnapproveConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={unapproveTimecard.isPending}
          >
            <Undo2 className="w-4 h-4 mr-2" />
            {t('detail_hub.timecard.approval.dialog.confirm_unapprove') || 'Confirm Unapprove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Edit Time Entry Modal */}
    <EditTimeEntryModal
      open={showEditModal}
      onOpenChange={setShowEditModal}
      timeEntry={selectedTimeEntryForEdit}
    />
    </>
  );
}
